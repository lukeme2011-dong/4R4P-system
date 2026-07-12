"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ==================== 2.1 创建测评（候选人无需登录） ====================
router.post('/create', (req, res) => {
    const { candidate_name, position, department, interview_date, interview_round, interviewer_name } = req.body;
    if (!candidate_name) {
        return res.status(400).json({ message: '候选人姓名不能为空' });
    }
    // 生成唯一测评编码 TEST-YYYYMMDD-XXXXXX
    const now = new Date();
    const dateStr = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const assessment_code = 'TEST-' + dateStr + '-' + random;
    // 查询岗位权重配置
    const lookupWeight = (callback) => {
        if (position) {
            database_1.db.get('SELECT r1_weight, r2_weight, r3_weight, r4_weight FROM position_weight_configs WHERE position_name = ?', [position], (err, row) => {
                if (err || !row) {
                    // 未匹配到岗位权重，使用默认权重
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
    // 查询题量设置
    database_1.db.get('SELECT * FROM test_settings WHERE id = 1', (err, settings) => {
        const useWeightDist = settings?.use_weight_distribution ?? 1;
        const totalQuestions = settings?.total_questions ?? 20;
        lookupWeight((weights) => {
            // 根据岗位权重按比例分配各R类型题量
            let r1Count, r2Count, r3Count, r4Count;
            if (useWeightDist === 1) {
                // 按权重比例分配题量
                const w1 = weights.r1_weight;
                const w2 = weights.r2_weight;
                const w3 = weights.r3_weight;
                const w4 = weights.r4_weight;
                const total = w1 + w2 + w3 + w4;
                r1Count = Math.round(totalQuestions * w1 / total);
                r2Count = Math.round(totalQuestions * w2 / total);
                r3Count = Math.round(totalQuestions * w3 / total);
                r4Count = totalQuestions - r1Count - r2Count - r3Count;
            }
            else {
                // 使用固定题量配置
                r1Count = settings?.r1_count ?? 5;
                r2Count = settings?.r2_count ?? 5;
                r3Count = settings?.r3_count ?? 5;
                r4Count = settings?.r4_count ?? 5;
            }
            // 确保每种类型至少1题
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
                database_1.db.all('SELECT * FROM evaluation_questions WHERE r_type = ? AND status = \'active\'', [rType], (err, questions) => {
                    if (err) {
                        return res.status(500).json({ message: '查询题目失败' });
                    }
                    // 随机选题（不足则全选）
                    const shuffled = questions.sort(() => Math.random() - 0.5);
                    const selected = shuffled.slice(0, count);
                    allQuestions = allQuestions.concat(selected.map(q => ({ ...q, r_type: rType })));
                    completed++;
                    if (completed === 4) {
                        // 所有维度的题目都已选好，创建assessment记录
                        database_1.db.run(`INSERT INTO assessments (assessment_code, candidate_name, position, department, interview_date, interview_round, interviewer_name, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`, [assessment_code, candidate_name, position || null, department || null, interview_date || null, interview_round || null, interviewer_name || null], function (err) {
                            if (err) {
                                return res.status(400).json({ message: '创建测评失败: ' + err.message });
                            }
                            const assessment_id = this.lastID;
                            // 创建assessment_answers记录
                            let answerCompleted = 0;
                            const totalAnswers = allQuestions.length;
                            if (totalAnswers === 0) {
                                return res.json({
                                    assessment_id,
                                    assessment_code,
                                    questions: []
                                });
                            }
                            allQuestions.forEach(q => {
                                database_1.db.run(`INSERT INTO assessment_answers (assessment_id, question_id, r_type)
                       VALUES (?, ?, ?)`, [assessment_id, q.id, q.r_type], function (err) {
                                    answerCompleted++;
                                    if (answerCompleted === totalAnswers) {
                                        // 返回结果
                                        res.json({
                                            assessment_id,
                                            assessment_code,
                                            questions: allQuestions.map(q => ({
                                                question_id: q.id,
                                                r_type: q.r_type,
                                                question: q.question,
                                                options: q.options ? JSON.parse(q.options) : null,
                                                is_veto: q.is_veto || 0
                                            }))
                                        });
                                    }
                                });
                            });
                        });
                    }
                });
            });
        });
    });
});
// ==================== 2.2 获取测评详情（候选人+HR均可用） ====================
router.get('/detail/:id', (req, res) => {
    const { id } = req.params;
    database_1.db.get('SELECT * FROM assessments WHERE id = ?', [id], (err, assessment) => {
        if (err) {
            console.error('查询assessment失败:', err.message);
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!assessment) {
            return res.status(404).json({ message: '测评不存在' });
        }
        // 获取关联的答题明细（含题目内容）
        database_1.db.all(`SELECT aa.*, eq.question, eq.options, eq.correct_answer, eq.score as question_score, eq.category, eq.is_veto as question_is_veto
       FROM assessment_answers aa
       LEFT JOIN evaluation_questions eq ON aa.question_id = eq.id
       WHERE aa.assessment_id = ?
       ORDER BY aa.r_type, aa.id`, [id], (err, answers) => {
            if (err) {
                console.error('查询answers失败:', err.message);
                return res.status(500).json({ message: '服务器错误' });
            }
            try {
                const parsedAnswers = answers.map(a => ({
                    ...a,
                    options: a.options ? JSON.parse(a.options) : null
                }));
                res.json({
                    assessment,
                    answers: parsedAnswers
                });
            }
            catch (parseErr) {
                console.error('JSON解析失败:', parseErr.message);
                return res.status(500).json({ message: '服务器错误' });
            }
        });
    });
});
// ==================== 2.3 通过编码获取测评（候选人+HR均可用） ====================
router.get('/code/:code', (req, res) => {
    const { code } = req.params;
    database_1.db.get('SELECT * FROM assessments WHERE assessment_code = ?', [code], (err, assessment) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!assessment) {
            return res.status(404).json({ message: '测评不存在' });
        }
        database_1.db.all(`SELECT aa.*, eq.question, eq.options, eq.correct_answer, eq.score as question_score, eq.category, eq.is_veto as question_is_veto
       FROM assessment_answers aa
       LEFT JOIN evaluation_questions eq ON aa.question_id = eq.id
       WHERE aa.assessment_id = ?
       ORDER BY aa.r_type, aa.id`, [assessment.id], (err, answers) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            const parsedAnswers = answers.map(a => ({
                ...a,
                options: a.options ? JSON.parse(a.options) : null
            }));
            res.json({
                assessment,
                answers: parsedAnswers
            });
        });
    });
});
// ==================== 2.4 保存单题答案（候选人端） ====================
router.put('/:id/answer', (req, res) => {
    const { id } = req.params;
    const { question_id, score, is_veto, star_situation, star_task, star_action, star_result } = req.body;
    if (!question_id) {
        return res.status(400).json({ message: '题目ID不能为空' });
    }
    // 更新答题记录
    database_1.db.run(`UPDATE assessment_answers SET score = ?, is_veto = ?, star_situation = ?, star_task = ?, star_action = ?, star_result = ?
     WHERE assessment_id = ? AND question_id = ?`, [score !== undefined ? score : null, is_veto || 0, star_situation || null, star_task || null, star_action || null, star_result || null, id, question_id], function (err) {
        if (err) {
            return res.status(400).json({ message: '保存答案失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '答题记录不存在' });
        }
        // 如果is_veto=1，标记assessment.has_veto=1
        if (is_veto === 1) {
            database_1.db.run('UPDATE assessments SET has_veto = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], (err) => {
                if (err) {
                    return res.status(500).json({ message: '更新否决标记失败' });
                }
                res.json({ message: '答案已保存' });
            });
        }
        else {
            res.json({ message: '答案已保存' });
        }
    });
});
// ==================== 2.5 批量保存草稿（候选人端） ====================
router.put('/:id/draft', (req, res) => {
    const { id } = req.params;
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ message: '答案数据不能为空' });
    }
    let completed = 0;
    const total = answers.length;
    let hasError = false;
    answers.forEach((answer) => {
        if (hasError)
            return;
        database_1.db.run(`UPDATE assessment_answers SET score = ?, is_veto = ?, star_situation = ?, star_task = ?, star_action = ?, star_result = ?
       WHERE assessment_id = ? AND question_id = ?`, [
            answer.score !== undefined ? answer.score : null,
            answer.is_veto || 0,
            answer.star_situation || null,
            answer.star_task || null,
            answer.star_action || null,
            answer.star_result || null,
            id,
            answer.question_id
        ], function (err) {
            if (hasError)
                return;
            if (err) {
                hasError = true;
                return res.status(400).json({ message: '保存草稿失败' });
            }
            completed++;
            if (completed === total) {
                // 更新assessment_drafts
                const draftData = JSON.stringify(answers);
                database_1.db.get('SELECT id FROM assessment_drafts WHERE assessment_id = ?', [id], (err, draft) => {
                    if (err) {
                        return res.status(500).json({ message: '服务器错误' });
                    }
                    if (draft) {
                        database_1.db.run('UPDATE assessment_drafts SET draft_data = ?, updated_at = CURRENT_TIMESTAMP WHERE assessment_id = ?', [draftData, id], (err) => {
                            if (err) {
                                return res.status(500).json({ message: '更新草稿失败' });
                            }
                            res.json({ message: '草稿已保存' });
                        });
                    }
                    else {
                        database_1.db.run('INSERT INTO assessment_drafts (assessment_id, draft_data) VALUES (?, ?)', [id, draftData], (err) => {
                            if (err) {
                                return res.status(500).json({ message: '保存草稿失败' });
                            }
                            res.json({ message: '草稿已保存' });
                        });
                    }
                });
            }
        });
    });
});
// ==================== 2.6 提交测评（候选人端） ====================
router.post('/:id/submit', (req, res) => {
    const { id } = req.params;
    // 获取测评信息
    database_1.db.get('SELECT * FROM assessments WHERE id = ?', [id], (err, assessment) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!assessment) {
            return res.status(404).json({ message: '测评不存在' });
        }
        if (assessment.status === 'submitted') {
            return res.status(400).json({ message: '该测评已提交，不可重复提交' });
        }
        // 获取所有答题记录
        database_1.db.all('SELECT * FROM assessment_answers WHERE assessment_id = ?', [id], (err, answers) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            // 校验：所有题目必须有score
            const noScoreAnswers = answers.filter(a => a.score === null || a.score === undefined);
            if (noScoreAnswers.length > 0) {
                return res.status(400).json({ message: `还有${noScoreAnswers.length}题未评分，请完成所有评分后提交` });
            }
            // 校验：所有题目必须填写STAR（四个字段都不为空）
            const noStarAnswers = answers.filter(a => !a.star_situation || !a.star_task || !a.star_action || !a.star_result);
            if (noStarAnswers.length > 0) {
                return res.status(400).json({ message: `还有${noStarAnswers.length}题未填写完整的STAR行为描述，请补充后提交` });
            }
            // 查询岗位权重
            const fetchWeightsAndCalculate = () => {
                const posName = assessment.position;
                if (posName) {
                    database_1.db.get('SELECT r1_weight, r2_weight, r3_weight, r4_weight FROM position_weight_configs WHERE position_name = ?', [posName], (err, weightConfig) => {
                        if (err || !weightConfig) {
                            calculateScores(assessment, answers, { r1_weight: 25, r2_weight: 25, r3_weight: 25, r4_weight: 25 });
                        }
                        else {
                            calculateScores(assessment, answers, weightConfig);
                        }
                    });
                }
                else {
                    calculateScores(assessment, answers, { r1_weight: 25, r2_weight: 25, r3_weight: 25, r4_weight: 25 });
                }
            };
            const calculateScores = (assessmentData, answerList, weights) => {
                // 按维度分组计算
                const rTypes = ['r1', 'r2', 'r3', 'r4'];
                const dimensionScores = {};
                const dimensionConverted = {};
                const dimensionWeighted = {};
                rTypes.forEach(rType => {
                    const typeAnswers = answerList.filter(a => a.r_type === rType);
                    if (typeAnswers.length === 0) {
                        dimensionScores[rType] = 0;
                        dimensionConverted[rType] = 0;
                        dimensionWeighted[rType] = 0;
                        return;
                    }
                    // 维度平均分 = 该维度所有题目score的平均值
                    const avg = typeAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / typeAnswers.length;
                    dimensionScores[rType] = Math.round(avg * 100) / 100;
                    // 维度换算分 = 维度平均分 * 20（将5分制换算为100分制）
                    const converted = avg * 20;
                    dimensionConverted[rType] = Math.round(converted * 100) / 100;
                    // 加权分 = 维度换算分 * 该维度权重/100
                    const weightKey = `${rType}_weight`;
                    const weighted = converted * (weights[weightKey] || 25) / 100;
                    dimensionWeighted[rType] = Math.round(weighted * 100) / 100;
                });
                // 综合总分
                const total_score = Math.round((dimensionWeighted.r1 + dimensionWeighted.r2 + dimensionWeighted.r3 + dimensionWeighted.r4) * 100) / 100;
                // 自动判定等级
                let talent_level = '';
                let hire_suggestion = '';
                // 如果has_veto=1，强制等级=D
                if (assessmentData.has_veto === 1) {
                    talent_level = 'D';
                    hire_suggestion = '不合格';
                }
                else {
                    if (total_score >= 90) {
                        talent_level = 'S';
                        hire_suggestion = '强烈推荐';
                    }
                    else if (total_score >= 80) {
                        talent_level = 'A';
                        hire_suggestion = '推荐';
                    }
                    else if (total_score >= 70) {
                        talent_level = 'B';
                        hire_suggestion = '待定';
                    }
                    else if (total_score >= 60) {
                        talent_level = 'C';
                        hire_suggestion = '不推荐';
                    }
                    else {
                        talent_level = 'D';
                        hire_suggestion = '不合格';
                    }
                }
                // 优势短板：维度换算分>=80为优势，<60为短板
                const strengths = [];
                const weaknesses = [];
                const dimensionNames = {
                    r1: 'R1合规责任',
                    r2: 'R2能力责任',
                    r3: 'R3协作责任',
                    r4: 'R4格局责任'
                };
                rTypes.forEach(rType => {
                    if (dimensionConverted[rType] >= 80) {
                        strengths.push(dimensionNames[rType]);
                    }
                    if (dimensionConverted[rType] < 60) {
                        weaknesses.push(dimensionNames[rType]);
                    }
                });
                // 更新assessment记录
                database_1.db.run(`UPDATE assessments SET
              r1_score = ?, r2_score = ?, r3_score = ?, r4_score = ?,
              r1_weighted = ?, r2_weighted = ?, r3_weighted = ?, r4_weighted = ?,
              total_score = ?, talent_level = ?, hire_suggestion = ?,
              strengths = ?, weaknesses = ?,
              status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`, [
                    dimensionScores.r1, dimensionScores.r2, dimensionScores.r3, dimensionScores.r4,
                    dimensionWeighted.r1, dimensionWeighted.r2, dimensionWeighted.r3, dimensionWeighted.r4,
                    total_score, talent_level, hire_suggestion,
                    strengths.join(','), weaknesses.join(','),
                    id
                ], function (err) {
                    if (err) {
                        return res.status(400).json({ message: '提交测评失败: ' + err.message });
                    }
                    res.json({
                        message: '测评提交成功',
                        result: {
                            total_score,
                            talent_level,
                            hire_suggestion,
                            r1_score: dimensionScores.r1,
                            r2_score: dimensionScores.r2,
                            r3_score: dimensionScores.r3,
                            r4_score: dimensionScores.r4,
                            r1_weighted: dimensionWeighted.r1,
                            r2_weighted: dimensionWeighted.r2,
                            r3_weighted: dimensionWeighted.r3,
                            r4_weighted: dimensionWeighted.r4,
                            strengths,
                            weaknesses
                        }
                    });
                });
            };
            fetchWeightsAndCalculate();
        });
    });
});
// ==================== 2.7 测评档案列表（HR后台） ====================
router.get('/list', auth_1.authenticate, (req, res) => {
    const { page = 1, pageSize = 10, candidate_name, position, assessment_code, interview_date, talent_level, date_from, date_to } = req.query;
    const user = req.user;
    // 候选人需要查询其real_name用于过滤个人数据
    const fetchUserRealName = (cb) => {
        if (user.role !== 'admin' && user.role !== 'hr') {
            database_1.db.get('SELECT real_name FROM users WHERE id = ?', [user.id], (err, userInfo) => {
                if (err || !userInfo) {
                    cb(null);
                }
                else {
                    cb(userInfo.real_name);
                }
            });
        }
        else {
            cb(null);
        }
    };
    fetchUserRealName((userRealName) => {
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (user.role !== 'admin' && user.role !== 'hr') {
            whereClause += ' AND candidate_name = ?';
            params.push(userRealName || '');
        }
        if (candidate_name && (user.role === 'admin' || user.role === 'hr')) {
            whereClause += ' AND candidate_name LIKE ?';
            params.push(`%${candidate_name}%`);
        }
        if (position && (user.role === 'admin' || user.role === 'hr')) {
            whereClause += ' AND position LIKE ?';
            params.push(`%${position}%`);
        }
        if (assessment_code) {
            whereClause += ' AND assessment_code LIKE ?';
            params.push(`%${assessment_code}%`);
        }
        if (interview_date) {
            whereClause += ' AND interview_date = ?';
            params.push(interview_date);
        }
        if (talent_level && (user.role === 'admin' || user.role === 'hr')) {
            whereClause += ' AND talent_level = ?';
            params.push(talent_level);
        }
        if (date_from) {
            whereClause += ' AND interview_date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            whereClause += ' AND interview_date <= ?';
            params.push(date_to);
        }
        const countSql = `SELECT COUNT(*) as total FROM assessments ${whereClause}`;
        const dataSql = `SELECT * FROM assessments ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        database_1.db.get(countSql, params, (err, countRow) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            const limit = parseInt(pageSize);
            const offset = (parseInt(page) - 1) * limit;
            params.push(limit, offset);
            database_1.db.all(dataSql, params, (err, list) => {
                if (err) {
                    return res.status(500).json({ message: '服务器错误' });
                }
                res.json({
                    list,
                    total: countRow.total,
                    page: parseInt(page),
                    pageSize: parseInt(pageSize)
                });
            });
        });
    });
});
// ==================== 2.8 删除测评（admin和hr） ====================
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.get('SELECT id, candidate_name FROM assessments WHERE id = ?', [id], (err, assessment) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!assessment) {
            return res.status(404).json({ message: '测评不存在' });
        }
        database_1.db.run('DELETE FROM assessment_answers WHERE assessment_id = ?', [id], (err) => {
            if (err) {
                return res.status(500).json({ message: '删除答题记录失败' });
            }
            database_1.db.run('DELETE FROM assessment_drafts WHERE assessment_id = ?', [id], (err) => {
                if (err) {
                    return res.status(500).json({ message: '删除草稿记录失败' });
                }
                database_1.db.run('DELETE FROM personality_test_answers WHERE test_id IN (SELECT id FROM personality_tests WHERE assessment_code IN (SELECT assessment_code FROM assessments WHERE id = ?))', [id], (err) => {
                    if (err) {
                        return res.status(500).json({ message: '删除测评答题记录失败' });
                    }
                    database_1.db.run('DELETE FROM personality_tests WHERE assessment_code IN (SELECT assessment_code FROM assessments WHERE id = ?)', [id], (err) => {
                        if (err) {
                            return res.status(500).json({ message: '删除测评记录失败' });
                        }
                        database_1.db.run('DELETE FROM assessments WHERE id = ?', [id], function (err) {
                            if (err) {
                                return res.status(500).json({ message: '删除测评失败' });
                            }
                            if (this.changes === 0) {
                                return res.status(404).json({ message: '测评不存在' });
                            }
                            res.json({ message: '删除成功' });
                        });
                    });
                });
            });
        });
    });
});
// ==================== 2.9 获取测评报告数据（HR+候选人可用） ====================
router.get('/:id/report', (req, res) => {
    const { id } = req.params;
    database_1.db.get('SELECT * FROM assessments WHERE id = ?', [id], (err, assessment) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!assessment) {
            return res.status(404).json({ message: '测评不存在' });
        }
        database_1.db.all(`SELECT aa.*, eq.question, eq.options, eq.correct_answer, eq.score as question_score, eq.category, eq.is_veto as question_is_veto
       FROM assessment_answers aa
       LEFT JOIN evaluation_questions eq ON aa.question_id = eq.id
       WHERE aa.assessment_id = ?
       ORDER BY aa.r_type, aa.id`, [id], (err, answers) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            const parsedAnswers = answers.map(a => ({
                ...a,
                options: a.options ? JSON.parse(a.options) : null
            }));
            // 按维度汇总
            const rTypes = ['r1', 'r2', 'r3', 'r4'];
            const dimensionNames = {
                r1: 'R1合规责任',
                r2: 'R2能力责任',
                r3: 'R3协作责任',
                r4: 'R4格局责任'
            };
            const summary = rTypes.map(rType => {
                const typeAnswers = parsedAnswers.filter(a => a.r_type === rType);
                const scores = typeAnswers.map(a => a.score || 0);
                const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
                return {
                    r_type: rType,
                    name: dimensionNames[rType],
                    avg_score: Math.round(avg * 100) / 100,
                    converted_score: Math.round(avg * 20 * 100) / 100,
                    weighted_score: assessment[`${rType}_weighted`],
                    question_count: typeAnswers.length,
                    answers: typeAnswers
                };
            });
            res.json({
                assessment,
                summary,
                answers: parsedAnswers
            });
        });
    });
});
// ==================== 2.10 获取所有题目（候选人端答题用，不需要认证） ====================
router.get('/questions', (req, res) => {
    const { assessment_id } = req.query;
    if (!assessment_id) {
        return res.status(400).json({ message: 'assessment_id参数不能为空' });
    }
    // 验证assessment存在
    database_1.db.get('SELECT * FROM assessments WHERE id = ?', [assessment_id], (err, assessment) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!assessment) {
            return res.status(404).json({ message: '测评不存在' });
        }
        // 返回该测评关联的题目及当前答案
        database_1.db.all(`SELECT aa.id as answer_id, aa.question_id, aa.r_type, aa.score, aa.is_veto,
              aa.star_situation, aa.star_task, aa.star_action, aa.star_result,
              eq.question, eq.options, eq.is_veto as question_is_veto
       FROM assessment_answers aa
       LEFT JOIN evaluation_questions eq ON aa.question_id = eq.id
       WHERE aa.assessment_id = ?
       ORDER BY aa.r_type, aa.id`, [assessment_id], (err, answers) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            const parsedAnswers = answers.map(a => ({
                ...a,
                options: a.options ? JSON.parse(a.options) : null
            }));
            res.json({
                assessment: {
                    id: assessment.id,
                    assessment_code: assessment.assessment_code,
                    candidate_name: assessment.candidate_name,
                    position: assessment.position,
                    status: assessment.status
                },
                questions: parsedAnswers
            });
        });
    });
});
// ==================== 2.11 题库管理增强接口 ====================
// 编辑试题
router.put('/questions/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { r_type, question, options, correct_answer, score, category, status, is_veto } = req.body;
    const updates = [];
    const params = [];
    if (r_type !== undefined) {
        updates.push('r_type = ?');
        params.push(r_type);
    }
    if (question !== undefined) {
        updates.push('question = ?');
        params.push(question);
    }
    if (options !== undefined) {
        updates.push('options = ?');
        params.push(typeof options === 'string' ? options : JSON.stringify(options));
    }
    if (correct_answer !== undefined) {
        updates.push('correct_answer = ?');
        params.push(correct_answer);
    }
    if (score !== undefined) {
        updates.push('score = ?');
        params.push(score);
    }
    if (category !== undefined) {
        updates.push('category = ?');
        params.push(category);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
    }
    if (is_veto !== undefined) {
        updates.push('is_veto = ?');
        params.push(is_veto);
    }
    if (updates.length === 0) {
        return res.status(400).json({ message: '没有需要更新的字段' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    database_1.db.run(`UPDATE evaluation_questions SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
        if (err) {
            return res.status(400).json({ message: '更新失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '试题不存在' });
        }
        res.json({ message: '试题更新成功' });
    });
});
// 批量导出所有试题（JSON格式）
router.get('/questions/export', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    database_1.db.all('SELECT * FROM evaluation_questions ORDER BY r_type, id', (err, questions) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        const exportData = questions.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : null
        }));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=questions_export.json');
        res.json(exportData);
    });
});
// 批量导入试题（增强版，增加is_veto字段支持和mode参数）
router.post('/questions/import', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { questions, mode = 'increment' } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: '导入数据不能为空' });
    }
    const validRTypes = ['r1', 'r2', 'r3', 'r4'];
    const validQuestions = questions.filter(q => q.r_type && validRTypes.includes(q.r_type.toLowerCase()) && q.question);
    if (validQuestions.length === 0) {
        return res.status(400).json({ message: '没有有效的试题数据' });
    }
    // replace模式先清空再导入
    if (mode === 'replace') {
        database_1.db.run('DELETE FROM evaluation_questions', (err) => {
            if (err) {
                return res.status(500).json({ message: '清空题库失败' });
            }
            doImport(validQuestions, res);
        });
    }
    else {
        // increment模式直接追加
        doImport(validQuestions, res);
    }
});
// 导入试题的通用方法
function doImport(validQuestions, res) {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    validQuestions.forEach((q, index) => {
        const r_type = q.r_type.toLowerCase();
        const question = q.question;
        const options = q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null;
        const correct_answer = q.correct_answer || null;
        const score = q.score || 10;
        const category = q.category || 'standard';
        const is_veto = q.is_veto || 0;
        database_1.db.run('INSERT INTO evaluation_questions (r_type, question, options, correct_answer, score, category, is_veto) VALUES (?, ?, ?, ?, ?, ?, ?)', [r_type, question, options, correct_answer, score, category, is_veto], function (err) {
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
}
// ==================== 2.12 岗位权重配置接口 ====================
// 获取所有岗位权重配置
router.get('/weights', auth_1.authenticate, (req, res) => {
    database_1.db.all('SELECT * FROM position_weight_configs ORDER BY created_at DESC', (err, weights) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(weights);
    });
});
// 新增岗位权重配置
router.post('/weights', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { position_name, r1_weight, r2_weight, r3_weight, r4_weight, category, description, match_threshold, veto_dimension } = req.body;
    if (!position_name) {
        return res.status(400).json({ message: '岗位名称不能为空' });
    }
    // 校验权重之和为100
    const total = (r1_weight || 25) + (r2_weight || 25) + (r3_weight || 25) + (r4_weight || 25);
    if (total !== 100) {
        return res.status(400).json({ message: '权重之和必须为100' });
    }
    database_1.db.run(`INSERT INTO position_weight_configs (position_name, r1_weight, r2_weight, r3_weight, r4_weight, category, description, match_threshold, veto_dimension)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [position_name, r1_weight || 25, r2_weight || 25, r3_weight || 25, r4_weight || 25, category || null, description || null, match_threshold || 12, veto_dimension || null], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ message: '该岗位权重配置已存在' });
            }
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: '岗位权重配置创建成功' });
    });
});
// 修改岗位权重配置
router.put('/weights/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { position_name, r1_weight, r2_weight, r3_weight, r4_weight, category, description, match_threshold, veto_dimension } = req.body;
    // 校验权重之和为100（如果提供了权重）
    if (r1_weight !== undefined || r2_weight !== undefined || r3_weight !== undefined || r4_weight !== undefined) {
        const total = (r1_weight || 25) + (r2_weight || 25) + (r3_weight || 25) + (r4_weight || 25);
        if (total !== 100) {
            return res.status(400).json({ message: '权重之和必须为100' });
        }
    }
    const updates = [];
    const params = [];
    if (position_name !== undefined) {
        updates.push('position_name = ?');
        params.push(position_name);
    }
    if (r1_weight !== undefined) {
        updates.push('r1_weight = ?');
        params.push(r1_weight);
    }
    if (r2_weight !== undefined) {
        updates.push('r2_weight = ?');
        params.push(r2_weight);
    }
    if (r3_weight !== undefined) {
        updates.push('r3_weight = ?');
        params.push(r3_weight);
    }
    if (r4_weight !== undefined) {
        updates.push('r4_weight = ?');
        params.push(r4_weight);
    }
    if (category !== undefined) {
        updates.push('category = ?');
        params.push(category);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
    }
    if (match_threshold !== undefined) {
        updates.push('match_threshold = ?');
        params.push(match_threshold);
    }
    if (veto_dimension !== undefined) {
        updates.push('veto_dimension = ?');
        params.push(veto_dimension);
    }
    if (updates.length === 0) {
        return res.status(400).json({ message: '没有需要更新的字段' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    database_1.db.run(`UPDATE position_weight_configs SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ message: '该岗位名称已存在' });
            }
            return res.status(400).json({ message: '更新失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '权重配置不存在' });
        }
        res.json({ message: '权重配置更新成功' });
    });
});
// 删除岗位权重配置
router.delete('/weights/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM position_weight_configs WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(400).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '权重配置不存在' });
        }
        res.json({ message: '权重配置删除成功' });
    });
});
// 初始化预设权重（12个标准岗位类型）
router.post('/weights/init', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const presets = [
        { position_name: '高层管理岗', r1_weight: 15, r2_weight: 30, r3_weight: 15, r4_weight: 40, category: '高层管理', description: '总经理/总监/创始人：战略布局、长期方向、企业文化、组织顶层设计', match_threshold: 12, veto_dimension: 'r4' },
        { position_name: '中层管理岗', r1_weight: 25, r2_weight: 35, r3_weight: 20, r4_weight: 20, category: '中层管理', description: '部门经理/项目负责人/主管：部门KPI、项目交付、业绩指标、团队整体产出', match_threshold: 12, veto_dimension: '' },
        { position_name: '基层管理岗', r1_weight: 30, r2_weight: 35, r3_weight: 25, r4_weight: 10, category: '基层管理', description: '组长/小团队负责人：落实制度、流程规范、团队执行', match_threshold: 15, veto_dimension: '' },
        { position_name: '销售商务岗', r1_weight: 15, r2_weight: 55, r3_weight: 20, r4_weight: 10, category: '销售商务', description: '销售/商务/客户经理：销售额、回款、新客拓展、业绩排名，绝对核心', match_threshold: 12, veto_dimension: 'r2' },
        { position_name: '研发技术岗', r1_weight: 25, r2_weight: 40, r3_weight: 20, r4_weight: 15, category: '研发技术', description: '研发/技术/测试/运维：迭代进度、bug率、项目交付、技术攻坚成果', match_threshold: 15, veto_dimension: '' },
        { position_name: '财务风控岗', r1_weight: 55, r2_weight: 20, r3_weight: 15, r4_weight: 10, category: '财务法务', description: '财务/法务/审计/风控：会计准则、报销制度、合同审核、合规红线', match_threshold: 12, veto_dimension: 'r1' },
        { position_name: '行政后勤岗', r1_weight: 45, r2_weight: 20, r3_weight: 25, r4_weight: 10, category: '行政后勤', description: '行政/后勤/仓储/前台：考勤、资产台账、采购流程、物资管理', match_threshold: 15, veto_dimension: '' },
        { position_name: '人力资源岗', r1_weight: 30, r2_weight: 25, r3_weight: 35, r4_weight: 10, category: '人力资源', description: 'HR/招聘/培训/员工关系：员工关怀、矛盾调解、上下级沟通、团队氛围建设', match_threshold: 15, veto_dimension: '' },
        { position_name: '市场品牌岗', r1_weight: 20, r2_weight: 40, r3_weight: 20, r4_weight: 20, category: '市场品牌', description: '市场/品牌/新媒体/策划：曝光量、转化数据、活动落地效果、传播指标', match_threshold: 15, veto_dimension: '' },
        { position_name: '生产质检岗', r1_weight: 40, r2_weight: 40, r3_weight: 15, r4_weight: 5, category: '生产质检', description: '生产/车间/质检/流水线：操作规范、安全生产、产能产量、良品率', match_threshold: 12, veto_dimension: 'r1' },
        { position_name: '客服售后岗', r1_weight: 25, r2_weight: 25, r3_weight: 45, r4_weight: 5, category: '客服售后', description: '客服/售后/投诉处理：情绪安抚、用户共情、纠纷化解（核心权重）', match_threshold: 15, veto_dimension: '' },
        { position_name: '采购供应链岗', r1_weight: 40, r2_weight: 30, r3_weight: 20, r4_weight: 10, category: '采购供应链', description: '采购/供应链/招投标：招标流程、比价制度、廉洁合规、采购审批', match_threshold: 12, veto_dimension: 'r1' }
    ];
    let completed = 0;
    let successCount = 0;
    let skipCount = 0;
    presets.forEach(preset => {
        database_1.db.run(`INSERT INTO position_weight_configs (position_name, r1_weight, r2_weight, r3_weight, r4_weight, is_preset, category, description, match_threshold, veto_dimension)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(position_name) DO UPDATE SET
         r1_weight = excluded.r1_weight,
         r2_weight = excluded.r2_weight,
         r3_weight = excluded.r3_weight,
         r4_weight = excluded.r4_weight,
         is_preset = 1,
         category = excluded.category,
         description = excluded.description,
         match_threshold = excluded.match_threshold,
         veto_dimension = excluded.veto_dimension,
         updated_at = CURRENT_TIMESTAMP`, [preset.position_name, preset.r1_weight, preset.r2_weight, preset.r3_weight, preset.r4_weight, preset.category, preset.description, preset.match_threshold, preset.veto_dimension], function (err) {
            completed++;
            if (err) {
                skipCount++;
            }
            else {
                successCount++;
            }
            if (completed === presets.length) {
                res.json({
                    message: `预设权重初始化完成：新增/更新${successCount}条，跳过${skipCount}条`,
                    successCount,
                    skipCount
                });
            }
        });
    });
});
// ==================== 2.13 测评题量设置接口 ====================
// 获取题量设置
router.get('/test-settings', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    database_1.db.get('SELECT * FROM test_settings WHERE id = 1', (err, row) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!row) {
            // 如果记录不存在，插入默认记录
            database_1.db.run(`INSERT INTO test_settings (id, total_questions, r1_count, r2_count, r3_count, r4_count, use_weight_distribution)
         VALUES (1, 20, 5, 5, 5, 5, 1)`, function (err) {
                if (err) {
                    return res.status(500).json({ message: '初始化设置失败' });
                }
                res.json({
                    id: 1,
                    total_questions: 20,
                    r1_count: 5,
                    r2_count: 5,
                    r3_count: 5,
                    r4_count: 5,
                    use_weight_distribution: 1
                });
            });
            return;
        }
        res.json(row);
    });
});
// 保存题量设置
router.put('/test-settings', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { total_questions, r1_count, r2_count, r3_count, r4_count, use_weight_distribution } = req.body;
    if (!total_questions || total_questions < 4) {
        return res.status(400).json({ message: '总题量不能少于4题' });
    }
    // 如果使用固定分配，校验各类型题量之和
    if (use_weight_distribution === 0) {
        const sum = (r1_count || 0) + (r2_count || 0) + (r3_count || 0) + (r4_count || 0);
        if (sum !== total_questions) {
            return res.status(400).json({ message: `各类型题量之和(${sum})必须等于总题量(${total_questions})` });
        }
    }
    database_1.db.run(`INSERT INTO test_settings (id, total_questions, r1_count, r2_count, r3_count, r4_count, use_weight_distribution, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       total_questions = excluded.total_questions,
       r1_count = excluded.r1_count,
       r2_count = excluded.r2_count,
       r3_count = excluded.r3_count,
       r4_count = excluded.r4_count,
       use_weight_distribution = excluded.use_weight_distribution,
       updated_at = CURRENT_TIMESTAMP`, [total_questions, r1_count || 5, r2_count || 5, r3_count || 5, r4_count || 5, use_weight_distribution ?? 1], function (err) {
        if (err) {
            return res.status(500).json({ message: '保存设置失败: ' + err.message });
        }
        res.json({ message: '题量设置保存成功' });
    });
});
// 预览按岗位权重分配的题量
router.get('/test-settings/preview', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const position_name = req.query.position_name;
    database_1.db.get('SELECT * FROM test_settings WHERE id = 1', (err, settings) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        const totalQuestions = settings?.total_questions ?? 20;
        const useWeightDist = settings?.use_weight_distribution ?? 1;
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
                r1Count = settings?.r1_count ?? 5;
                r2Count = settings?.r2_count ?? 5;
                r3Count = settings?.r3_count ?? 5;
                r4Count = settings?.r4_count ?? 5;
            }
            r1Count = Math.max(1, r1Count);
            r2Count = Math.max(1, r2Count);
            r3Count = Math.max(1, r3Count);
            r4Count = Math.max(1, r4Count);
            res.json({
                position_name: position_name || '默认',
                weights,
                total_questions: totalQuestions,
                use_weight_distribution: useWeightDist,
                distribution: {
                    r1: r1Count,
                    r2: r2Count,
                    r3: r3Count,
                    r4: r4Count
                }
            });
        });
    });
});
exports.default = router;
