"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, (req, res) => {
    const user = req.user;
    let whereClause = '';
    const params = [];
    if (user.role !== 'admin' && user.role !== 'hr') {
        whereClause = 'WHERE pt.user_id = ?';
        params.push(user.id);
    }
    database_1.db.all(`SELECT pt.id, pt.assessment_code, pt.r1_score, pt.r2_score, pt.r3_score, pt.r4_score,
            pt.personality_type as primary_combination, NULL as secondary_combination,
            pt.matching_score, pt.position_name, pt.created_at, pt.interview_date,
            pt.interview_round, pt.interviewer_name, pt.status, pt.has_veto,
            pt.talent_level, pt.hire_suggestion, pt.strengths, pt.weaknesses,
            pt.user_id, u.real_name as candidate_name, NULL as report
     FROM personality_tests pt
     LEFT JOIN users u ON pt.user_id = u.id
     ${whereClause}
     ORDER BY pt.created_at DESC`, params, (err, evaluations) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        const parsedEvaluations = evaluations.map((e) => ({
            ...e,
            strengths: e.strengths ? JSON.parse(e.strengths) : [],
            weaknesses: e.weaknesses ? JSON.parse(e.weaknesses) : []
        }));
        res.json(parsedEvaluations);
    });
});
// ==================== 性格测评抽题（按岗位权重随机出题） ====================
router.get('/personality/questions', auth_1.authenticate, (req, res) => {
    const { position_name } = req.query;
    // 查询岗位权重配置
    const lookupWeight = (callback) => {
        if (position_name) {
            database_1.db.get('SELECT r1_weight, r2_weight, r3_weight, r4_weight FROM position_weight_configs WHERE position_name = ?', [position_name], (err, row) => {
                if (err || !row) {
                    callback({ r1_weight: 25, r2_weight: 25, r3_weight: 25, r4_weight: 25 });
                }
                else {
                    callback(row);
                }
            });
        }
        else {
            callback({ r1_weight: 25, r2_weight: 25, r3_weight: 25, r4_weight: 25 });
        }
    };
    // 读取题量设置
    database_1.db.get('SELECT total_questions, use_weight_distribution, r1_count, r2_count, r3_count, r4_count FROM test_settings WHERE id = 1', (err, settings) => {
        const totalQuestions = settings?.total_questions || 30;
        const useWeightDist = settings?.use_weight_distribution ?? 1;
        lookupWeight((weights) => {
            let r1Count, r2Count, r3Count, r4Count;
            if (useWeightDist === 1) {
                const total = weights.r1_weight + weights.r2_weight + weights.r3_weight + weights.r4_weight;
                r1Count = Math.round(totalQuestions * weights.r1_weight / total);
                r2Count = Math.round(totalQuestions * weights.r2_weight / total);
                r3Count = Math.round(totalQuestions * weights.r3_weight / total);
                r4Count = totalQuestions - r1Count - r2Count - r3Count;
            }
            else {
                r1Count = settings?.r1_count || 8;
                r2Count = settings?.r2_count || 8;
                r3Count = settings?.r3_count || 7;
                r4Count = settings?.r4_count || 7;
            }
            r1Count = Math.max(1, r1Count);
            r2Count = Math.max(1, r2Count);
            r3Count = Math.max(1, r3Count);
            r4Count = Math.max(1, r4Count);
            const rTypeConfig = [
                { rType: 'r1', count: r1Count },
                { rType: 'r2', count: r2Count },
                { rType: 'r3', count: r3Count },
                { rType: 'r4', count: r4Count }
            ];
            let allQuestions = [];
            let completed = 0;
            rTypeConfig.forEach(({ rType, count }) => {
                database_1.db.all('SELECT id, r_type, question, options, category FROM evaluation_questions WHERE r_type = ? AND status = ?', [rType, 'active'], (err, questions) => {
                    if (err) {
                        return res.status(500).json({ message: '查询题目失败' });
                    }
                    const shuffled = questions.sort(() => Math.random() - 0.5);
                    const selected = shuffled.slice(0, count).map(q => ({
                        id: q.id,
                        r_type: q.r_type,
                        text: q.question,
                        options: q.options ? JSON.parse(q.options) : [],
                        category: q.category
                    }));
                    allQuestions = allQuestions.concat(selected);
                    completed++;
                    if (completed === 4) {
                        // 按R1→R2→R3→R4顺序排列，打乱同维度内顺序
                        allQuestions.sort(() => Math.random() - 0.5);
                        res.json({
                            position_name: position_name || '通用',
                            weights,
                            total: allQuestions.length,
                            distribution: { r1: r1Count, r2: r2Count, r3: r3Count, r4: r4Count },
                            questions: allQuestions
                        });
                    }
                });
            });
        });
    });
});
router.get('/personality/:user_id', auth_1.authenticate, (req, res) => {
    const { user_id } = req.params;
    database_1.db.get('SELECT * FROM personality_tests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [user_id], (err, test) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(test || null);
    });
});
// 性格测评结果提交（基于题库题目计算）
router.post('/personality', auth_1.authenticate, (req, res) => {
    const { user_id, answers, position_name } = req.body;
    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: '答题数据无效' });
    }
    // 计算各维度得分
    const scores = { r1: 0, r2: 0, r3: 0, r4: 0 };
    const countByType = { r1: 0, r2: 0, r3: 0, r4: 0 };
    answers.forEach((item) => {
        if (item.r_type && item.score !== undefined) {
            scores[item.r_type] += item.score;
            countByType[item.r_type]++;
        }
    });
    // 转换为百分制
    const r1_score = countByType.r1 > 0 ? Math.round(scores.r1 / countByType.r1) : 0;
    const r2_score = countByType.r2 > 0 ? Math.round(scores.r2 / countByType.r2) : 0;
    const r3_score = countByType.r3 > 0 ? Math.round(scores.r3 / countByType.r3) : 0;
    const r4_score = countByType.r4 > 0 ? Math.round(scores.r4 / countByType.r4) : 0;
    const sortedScores = [
        { type: 'R1', score: r1_score },
        { type: 'R2', score: r2_score },
        { type: 'R3', score: r3_score },
        { type: 'R4', score: r4_score }
    ].sort((a, b) => b.score - a.score);
    const personalityMap = {
        'R1': '坚守型',
        'R2': '奋斗型',
        'R3': '协作型',
        'R4': '使命型'
    };
    const personality_type = `${sortedScores[0].type}(0)${personalityMap[sortedScores[0].type]}`;
    // 计算人岗匹配度（如果有岗位）
    let matching_score = 0;
    if (position_name) {
        database_1.db.get('SELECT r1_weight, r2_weight, r3_weight, r4_weight, match_threshold FROM position_weight_configs WHERE position_name = ?', [position_name], (err, weightRow) => {
            if (weightRow) {
                matching_score = Math.round((r1_score * weightRow.r1_weight +
                    r2_score * weightRow.r2_weight +
                    r3_score * weightRow.r3_weight +
                    r4_score * weightRow.r4_weight) / 100);
            }
            saveResult();
        });
    }
    else {
        saveResult();
    }
    function saveResult() {
        const now = new Date();
        const dateStr = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        const assessment_code = 'TEST-' + dateStr + '-' + random;
        // 人才等级 & 录用建议
        let talent_level = 'D';
        let hire_suggestion = '不推荐';
        if (matching_score >= 90) {
            talent_level = 'S';
            hire_suggestion = '强烈推荐';
        }
        else if (matching_score >= 80) {
            talent_level = 'A';
            hire_suggestion = '推荐';
        }
        else if (matching_score >= 70) {
            talent_level = 'B';
            hire_suggestion = '待定';
        }
        else if (matching_score >= 60) {
            talent_level = 'C';
            hire_suggestion = '观察';
        }
        // 分析优势和短板
        const strengths = [];
        const weaknesses = [];
        const dimensionNames = {
            'R1': '规则遵守',
            'R2': '能力达成',
            'R3': '团队协作',
            'R4': '战略格局'
        };
        sortedScores.forEach(s => {
            if (s.score >= 70) {
                strengths.push(dimensionNames[s.type]);
            }
            else {
                weaknesses.push(dimensionNames[s.type]);
            }
        });
        // 检查是否有否决项
        const has_veto = answers.some((a) => a.is_veto === 1) ? 1 : 0;
        database_1.db.run(`INSERT INTO personality_tests (user_id, assessment_code, r1_score, r2_score, r3_score, r4_score, 
        personality_type, position_name, matching_score, interview_date, status, has_veto,
        talent_level, hire_suggestion, strengths, weaknesses)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?)`, [user_id, assessment_code, r1_score, r2_score, r3_score, r4_score,
            personality_type, position_name || null, matching_score, dateStr, has_veto,
            talent_level, hire_suggestion, JSON.stringify(strengths), JSON.stringify(weaknesses)], function (err) {
            if (err) {
                return res.status(400).json({ message: '创建失败' });
            }
            const personalityTestId = this.lastID;
            // 保存答题记录
            let completed = 0;
            const totalAnswers = answers.length;
            if (totalAnswers === 0) {
                syncAssessments();
            }
            else {
                answers.forEach((answer) => {
                    database_1.db.run(`INSERT INTO personality_test_answers (test_id, question_id, r_type, question, score, is_veto,
                star_situation, star_task, star_action, star_result)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [personalityTestId, answer.question_id || 0, answer.r_type || '', answer.text || '',
                        answer.score || 0, answer.is_veto || 0, answer.star_situation || '',
                        answer.star_task || '', answer.star_action || '', answer.star_result || ''], () => {
                        completed++;
                        if (completed === totalAnswers) {
                            syncAssessments();
                        }
                    });
                });
            }
            function syncAssessments() {
                database_1.db.get('SELECT real_name FROM users WHERE id = ?', [user_id], (err, userInfo) => {
                    const candidate_name = userInfo?.real_name || '';
                    database_1.db.run(`INSERT INTO assessments (assessment_code, candidate_name, position, interview_date,
                r1_score, r2_score, r3_score, r4_score, total_score, talent_level, hire_suggestion,
                has_veto, status, submitted_at, strengths, weaknesses)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP, ?, ?)`, [assessment_code, candidate_name, position_name || null, dateStr,
                        r1_score, r2_score, r3_score, r4_score, matching_score, talent_level, hire_suggestion,
                        has_veto, JSON.stringify(strengths), JSON.stringify(weaknesses)], (syncErr) => {
                        if (syncErr) {
                            console.error('同步测评档案失败:', syncErr.message);
                        }
                        res.status(201).json({
                            id: personalityTestId,
                            assessment_code,
                            r1_score,
                            r2_score,
                            r3_score,
                            r4_score,
                            personality_type,
                            position_name: position_name || null,
                            matching_score,
                            talent_level,
                            hire_suggestion,
                            strengths,
                            weaknesses,
                            has_veto,
                            message: '测评创建成功'
                        });
                    });
                });
            }
        });
    }
});
router.get('/questions', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { r_type, category, page = 1, pageSize = 20 } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (r_type) {
        whereClause += ' AND r_type = ?';
        params.push(r_type);
    }
    if (category) {
        whereClause += ' AND category = ?';
        params.push(category);
    }
    const countSql = `SELECT COUNT(*) as total FROM evaluation_questions ${whereClause}`;
    const dataSql = `SELECT * FROM evaluation_questions ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
    database_1.db.get(countSql, params, (err, countRow) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        const limit = parseInt(pageSize);
        const offset = (parseInt(page) - 1) * limit;
        params.push(limit, offset);
        database_1.db.all(dataSql, params, (err, questions) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            const parsedQuestions = questions.map((q) => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : null
            }));
            res.json({
                list: parsedQuestions,
                total: countRow.total,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            });
        });
    });
});
router.post('/questions/import', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: '导入数据不能为空' });
    }
    const validRTypes = ['r1', 'r2', 'r3', 'r4'];
    const validQuestions = questions.filter(q => q.r_type && validRTypes.includes(q.r_type.toLowerCase()) && q.question);
    if (validQuestions.length === 0) {
        return res.status(400).json({ message: '没有有效的试题数据' });
    }
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    validQuestions.forEach((q, index) => {
        const r_type = q.r_type.toLowerCase();
        const question = q.question;
        const options = q.options ? JSON.stringify(q.options) : null;
        const correct_answer = q.correct_answer || null;
        const score = q.score || 10;
        const category = q.category || 'standard';
        database_1.db.run('INSERT INTO evaluation_questions (r_type, question, options, correct_answer, score, category) VALUES (?, ?, ?, ?, ?, ?)', [r_type, question, options, correct_answer, score, category], function (err) {
            if (err) {
                errorCount++;
                errors.push(`第${index + 1}题: ${err.message}`);
            }
            else {
                successCount++;
            }
            if (successCount + errorCount === validQuestions.length) {
                res.json({
                    message: `导入完成：成功${successCount}条，失败${errorCount}条`,
                    successCount,
                    errorCount,
                    errors: errors.slice(0, 10)
                });
            }
        });
    });
});
router.delete('/questions/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM evaluation_questions WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(400).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '试题不存在' });
        }
        res.json({ message: '删除成功' });
    });
});
router.get('/:id', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    database_1.db.get(`SELECT pt.id, pt.assessment_code, pt.r1_score, pt.r2_score, pt.r3_score, pt.r4_score,
            pt.personality_type, pt.position_name, pt.matching_score, pt.created_at,
            pt.interview_date, pt.interview_round, pt.interviewer_name, pt.status,
            pt.has_veto, pt.talent_level, pt.hire_suggestion, pt.strengths, pt.weaknesses,
            u.real_name as candidate_name
     FROM personality_tests pt
     LEFT JOIN users u ON pt.user_id = u.id
     WHERE pt.id = ?`, [id], (err, evaluation) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!evaluation) {
            return res.status(404).json({ message: '测评记录不存在' });
        }
        database_1.db.all(`SELECT * FROM personality_test_answers WHERE test_id = ? ORDER BY r_type, id`, [id], (err, answers) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            res.json({
                ...evaluation,
                strengths: evaluation.strengths ? JSON.parse(evaluation.strengths) : [],
                weaknesses: evaluation.weaknesses ? JSON.parse(evaluation.weaknesses) : [],
                answers
            });
        });
    });
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM personality_tests WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '测评记录不存在' });
        }
        res.json({ message: '删除成功' });
    });
});
exports.default = router;
