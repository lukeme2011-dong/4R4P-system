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
    database_1.db.all('SELECT * FROM departments', (err, departments) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(departments);
    });
});
router.get('/:id', auth_1.authenticate, (req, res) => {
    const { id } = req.params;
    database_1.db.get('SELECT * FROM departments WHERE id = ?', [id], (err, department) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!department) {
            return res.status(404).json({ message: '部门不存在' });
        }
        res.json(department);
    });
});
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { name, parent_id, description } = req.body;
    database_1.db.run('INSERT INTO departments (name, parent_id, description) VALUES (?, ?, ?)', [name, parent_id || 0, description], function (err) {
        if (err) {
            return res.status(400).json({ message: '创建失败' });
        }
        res.status(201).json({ id: this.lastID, message: '部门创建成功' });
    });
});
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    const { name, parent_id, description } = req.body;
    database_1.db.run('UPDATE departments SET name = ?, parent_id = ?, description = ? WHERE id = ?', [name, parent_id || 0, description, id], function (err) {
        if (err) {
            return res.status(400).json({ message: '更新失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '部门不存在' });
        }
        res.json({ message: '部门更新成功' });
    });
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'hr']), (req, res) => {
    const { id } = req.params;
    database_1.db.run('DELETE FROM departments WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(400).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '部门不存在' });
        }
        res.json({ message: '部门删除成功' });
    });
});
exports.default = router;
