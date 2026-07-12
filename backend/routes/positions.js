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
    SELECT p.*, d.name as department_name 
    FROM positions p 
    LEFT JOIN departments d ON p.department_id = d.id
  `, (err, positions) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(positions);
    });
});
router.get('/:id', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    database_1.db.get(`
    SELECT p.*, d.name as department_name 
    FROM positions p 
    LEFT JOIN departments d ON p.department_id = d.id
    WHERE p.id = ?
  `, [id], (err, position) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!position) {
            return res.status(404).json({ message: '岗位不存在' });
        }
        res.json(position);
    });
});
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { name, department_id, level, r1_weight, r2_weight, r3_weight, r4_weight, description } = req.body;
    database_1.db.run('INSERT INTO positions (name, department_id, level, r1_weight, r2_weight, r3_weight, r4_weight, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [name, department_id, level, r1_weight, r2_weight, r3_weight, r4_weight, description], function (err) {
        if (err) {
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: '岗位创建成功' });
    });
});
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { name, department_id, level, r1_weight, r2_weight, r3_weight, r4_weight, description } = req.body;
    database_1.db.run('UPDATE positions SET name = ?, department_id = ?, level = ?, r1_weight = ?, r2_weight = ?, r3_weight = ?, r4_weight = ?, description = ? WHERE id = ?', [name, department_id, level, r1_weight, r2_weight, r3_weight, r4_weight, description, id], function (err) {
        if (err) {
            return res.status(400).json({ message: '更新失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '岗位不存在' });
        }
        res.json({ message: '岗位更新成功' });
    });
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM positions WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(400).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '岗位不存在' });
        }
        res.json({ message: '岗位删除成功' });
    });
});
router.get('/:id/behaviors', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    database_1.db.all('SELECT * FROM position_behavior WHERE position_id = ?', [id], (err, behaviors) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(behaviors);
    });
});
router.post('/:id/behaviors', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { r_type, behavior, score_criteria } = req.body;
    database_1.db.run('INSERT INTO position_behavior (position_id, r_type, behavior, score_criteria) VALUES (?, ?, ?, ?)', [id, r_type, behavior, score_criteria], function (err) {
        if (err) {
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: '行为指标创建成功' });
    });
});
router.get('/:id/combinations', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    database_1.db.all('SELECT * FROM position_combinations WHERE position_id = ?', [id], (err, combinations) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(combinations);
    });
});
router.post('/:id/combinations', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { combination, type, expected_value } = req.body;
    database_1.db.run('INSERT INTO position_combinations (position_id, combination, type, expected_value) VALUES (?, ?, ?, ?)', [id, combination, type, expected_value], function (err) {
        if (err) {
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: '责任组合创建成功' });
    });
});
exports.default = router;
