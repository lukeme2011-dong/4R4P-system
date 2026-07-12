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
    database_1.db.all(`
    SELECT pr.*, u.real_name as user_name, p.name as position_name 
    FROM performance_reviews pr 
    LEFT JOIN users u ON pr.user_id = u.id
    LEFT JOIN positions p ON pr.position_id = p.id
  `, (err, reviews) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(reviews);
    });
});
router.get('/dashboard', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    database_1.db.all('SELECT pr.*, u.real_name, u.department, u.position FROM performance_reviews pr LEFT JOIN users u ON pr.user_id = u.id', (err, reviews) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        const dashboard = {
            total: reviews.length,
            r1_avg: 0,
            r2_avg: 0,
            r3_avg: 0,
            r4_avg: 0,
            high_risk: [],
            trend: []
        };
        if (reviews.length > 0) {
            dashboard.r1_avg = Math.round(reviews.reduce((sum, r) => sum + (r.r1_score || 0), 0) / reviews.length);
            dashboard.r2_avg = Math.round(reviews.reduce((sum, r) => sum + (r.r2_score || 0), 0) / reviews.length);
            dashboard.r3_avg = Math.round(reviews.reduce((sum, r) => sum + (r.r3_score || 0), 0) / reviews.length);
            dashboard.r4_avg = Math.round(reviews.reduce((sum, r) => sum + (r.r4_score || 0), 0) / reviews.length);
            dashboard.high_risk = reviews.filter(r => (r.r1_score || 0) < 60 ||
                (r.r2_score || 0) < 60 ||
                (r.r3_score || 0) < 60 ||
                (r.r4_score || 0) < 60).map(r => ({
                name: r.real_name,
                department: r.department,
                position: r.position,
                risks: []
            }));
        }
        res.json(dashboard);
    });
});
router.get('/:id', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    database_1.db.get(`
    SELECT pr.*, u.real_name as user_name, p.name as position_name 
    FROM performance_reviews pr 
    LEFT JOIN users u ON pr.user_id = u.id
    LEFT JOIN positions p ON pr.position_id = p.id
    WHERE pr.id = ?
  `, [id], (err, review) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!review) {
            return res.status(404).json({ message: '绩效记录不存在' });
        }
        res.json(review);
    });
});
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { user_id, position_id, period, r1_score, r2_score, r3_score, r4_score, manager_comment } = req.body;
    database_1.db.get('SELECT r1_weight, r2_weight, r3_weight, r4_weight FROM positions WHERE id = ?', [position_id], (err, position) => {
        if (err || !position) {
            return res.status(400).json({ message: '岗位不存在' });
        }
        const overall_score = Math.round((r1_score * position.r1_weight +
            r2_score * position.r2_weight +
            r3_score * position.r3_weight +
            r4_score * position.r4_weight) / 100);
        database_1.db.run('INSERT INTO performance_reviews (user_id, position_id, period, r1_score, r2_score, r3_score, r4_score, overall_score, manager_comment, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [user_id, position_id, period, r1_score, r2_score, r3_score, r4_score, overall_score, manager_comment, 'completed'], function (err) {
            if (err) {
                return res.status(400).json({ message: '创建失败' });
            }
            res.status(201).json({ id: this.lastID, message: '绩效记录创建成功' });
        });
    });
});
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { r1_score, r2_score, r3_score, r4_score, manager_comment, status } = req.body;
    database_1.db.run('UPDATE performance_reviews SET r1_score = ?, r2_score = ?, r3_score = ?, r4_score = ?, manager_comment = ?, status = ? WHERE id = ?', [r1_score, r2_score, r3_score, r4_score, manager_comment, status, id], function (err) {
        if (err) {
            return res.status(400).json({ message: '更新失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '绩效记录不存在' });
        }
        res.json({ message: '绩效记录更新成功' });
    });
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM performance_reviews WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(400).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '绩效记录不存在' });
        }
        res.json({ message: '绩效记录删除成功' });
    });
});
router.get('/user/:user_id', auth_1.authenticate, (req, res) => {
    const { user_id } = req.params;
    database_1.db.all(`
    SELECT pr.*, p.name as position_name 
    FROM performance_reviews pr 
    LEFT JOIN positions p ON pr.position_id = p.id
    WHERE pr.user_id = ? ORDER BY period DESC
  `, [user_id], (err, reviews) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(reviews);
    });
});
router.get('/pdca/:user_id', auth_1.authenticate, (req, res) => {
    const { user_id } = req.params;
    database_1.db.all('SELECT * FROM pdca_records WHERE user_id = ? ORDER BY period DESC', [user_id], (err, records) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(records);
    });
});
router.post('/pdca', auth_1.authenticate, (req, res) => {
    const { user_id, period, plan, do_record, check_result, act_plan } = req.body;
    database_1.db.run('INSERT INTO pdca_records (user_id, period, plan, do_record, check_result, act_plan) VALUES (?, ?, ?, ?, ?, ?)', [user_id, period, plan, do_record, check_result, act_plan], function (err) {
        if (err) {
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: 'PDCA记录创建成功' });
    });
});
exports.default = router;
