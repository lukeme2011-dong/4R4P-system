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
    const { category } = req.query;
    let query = 'SELECT * FROM knowledge_base';
    const params = [];
    if (category) {
        query += ' WHERE category = ?';
        params.push(category);
    }
    database_1.db.all(query, params, (err, items) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(items);
    });
});
router.get('/:id', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    database_1.db.get('SELECT * FROM knowledge_base WHERE id = ?', [id], (err, item) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!item) {
            return res.status(404).json({ message: '知识库条目不存在' });
        }
        res.json(item);
    });
});
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { title, content, category, tags } = req.body;
    database_1.db.run('INSERT INTO knowledge_base (title, content, category, tags) VALUES (?, ?, ?, ?)', [title, content, category, tags], function (err) {
        if (err) {
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: '知识库条目创建成功' });
    });
});
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { title, content, category, tags } = req.body;
    database_1.db.run('UPDATE knowledge_base SET title = ?, content = ?, category = ?, tags = ? WHERE id = ?', [title, content, category, tags, id], function (err) {
        if (err) {
            return res.status(400).json({ message: '更新失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '知识库条目不存在' });
        }
        res.json({ message: '知识库条目更新成功' });
    });
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM knowledge_base WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(400).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '知识库条目不存在' });
        }
        res.json({ message: '知识库条目删除成功' });
    });
});
router.get('/categories/list', auth_1.authenticate, (req, res) => {
    database_1.db.all('SELECT DISTINCT category FROM knowledge_base', (err, categories) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(categories.map(c => c.category));
    });
});
router.post('/diagnosis', auth_1.authenticate, (req, res) => {
    const { scenario } = req.body;
    const keywords = {
        '违规': 'r1',
        '迟到': 'r1',
        '早退': 'r1',
        '完成': 'r2',
        '目标': 'r2',
        '绩效': 'r2',
        '协作': 'r3',
        '配合': 'r3',
        '沟通': 'r3',
        '大局': 'r4',
        '使命': 'r4',
        '愿景': 'r4'
    };
    const detectedR = [];
    for (const [word, rType] of Object.entries(keywords)) {
        if (scenario.includes(word)) {
            detectedR.push(rType);
        }
    }
    const formulaEngine = analyzeFormulas(scenario);
    res.json({
        detectedR: [...new Set(detectedR)],
        formulas: formulaEngine,
        recommendations: generateRecommendations(detectedR)
    });
});
function analyzeFormulas(scenario) {
    const formulas = [];
    if (scenario.includes('能力强') && scenario.includes('违规')) {
        formulas.push({
            type: '≠',
            expression: 'R2(N) ≠ R1(-1)',
            description: '能力强不等于可以违规，此人是风险，不是人才'
        });
    }
    if (scenario.includes('团队') && scenario.includes('绩效')) {
        formulas.push({
            type: '=',
            expression: 'R1(0)+R2(N)=+1',
            description: '守规+能力=绩优组合'
        });
    }
    if (scenario.includes('协作') && scenario.includes('完成')) {
        formulas.push({
            type: '+',
            expression: 'R3(+1)+R2(N)=+1',
            description: '协作+能力=绩优组合'
        });
    }
    return formulas;
}
function generateRecommendations(detectedR) {
    const recommendations = [];
    if (detectedR.includes('r1')) {
        recommendations.push('建议加强制度培训和流程规范');
    }
    if (detectedR.includes('r2')) {
        recommendations.push('建议制定能力提升计划');
    }
    if (detectedR.includes('r3')) {
        recommendations.push('建议组织团队建设活动');
    }
    if (detectedR.includes('r4')) {
        recommendations.push('建议加强企业文化宣导');
    }
    return recommendations;
}
exports.default = router;
