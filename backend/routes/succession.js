"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    database_1.db.all(`
    SELECT sp.*, u.real_name as user_name, p.name as position_name 
    FROM succession_plans sp 
    LEFT JOIN users u ON sp.user_id = u.id
    LEFT JOIN positions p ON sp.position_id = p.id
    ORDER BY priority DESC
  `, (err, plans) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(plans);
    });
});
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { position_id, user_id, priority } = req.body;
    database_1.db.run('INSERT INTO succession_plans (position_id, user_id, priority) VALUES (?, ?, ?)', [position_id, user_id, priority || 1], function (err) {
        if (err) {
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: '继任计划创建成功' });
    });
});
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { status, priority } = req.body;
    database_1.db.run('UPDATE succession_plans SET status = ?, priority = ? WHERE id = ?', [status, priority, id], function (err) {
        if (err) {
            return res.status(400).json({ message: '更新失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '继任计划不存在' });
        }
        res.json({ message: '继任计划更新成功' });
    });
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM succession_plans WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(400).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '继任计划不存在' });
        }
        res.json({ message: '继任计划删除成功' });
    });
});
router.get('/recommend/:position_id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { position_id } = req.params;
    database_1.db.get('SELECT r1_weight, r2_weight, r3_weight, r4_weight FROM positions WHERE id = ?', [position_id], (err, position) => {
        if (err || !position) {
            return res.status(400).json({ message: '岗位不存在' });
        }
        database_1.db.all(`
      SELECT u.*, pr.r1_score, pr.r2_score, pr.r3_score, pr.r4_score, pr.overall_score
      FROM users u
      LEFT JOIN performance_reviews pr ON u.id = pr.user_id
      WHERE u.role = 'employee'
      ORDER BY pr.overall_score DESC
      LIMIT 10
    `, (err, users) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            const recommendations = users.map(user => {
                const matchScore = Math.round(((user.r1_score || 0) * position.r1_weight +
                    (user.r2_score || 0) * position.r2_weight +
                    (user.r3_score || 0) * position.r3_weight +
                    (user.r4_score || 0) * position.r4_weight) / 100);
                return {
                    ...user,
                    match_score: matchScore
                };
            }).sort((a, b) => b.match_score - a.match_score);
            res.json(recommendations);
        });
    });
});
exports.default = router;
