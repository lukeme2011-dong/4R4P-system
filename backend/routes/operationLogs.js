"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, (0, auth_1.requirePermission)('log:view'), (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const module = req.query.module;
    const action = req.query.action;
    const username = req.query.username;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const offset = (page - 1) * pageSize;
    const conditions = [];
    const params = [];
    if (module) {
        conditions.push('module = ?');
        params.push(module);
    }
    if (action) {
        conditions.push('action LIKE ?');
        params.push(`%${action}%`);
    }
    if (username) {
        conditions.push('(username LIKE ? OR real_name LIKE ?)');
        params.push(`%${username}%`, `%${username}%`);
    }
    if (startDate) {
        conditions.push('created_at >= ?');
        params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
        conditions.push('created_at <= ?');
        params.push(`${endDate} 23:59:59`);
    }
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const countSql = `SELECT COUNT(*) as total FROM operation_logs ${whereClause}`;
    const listSql = `SELECT * FROM operation_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    database_1.db.get(countSql, params, (err, countRow) => {
        if (err) {
            return res.status(500).json({ message: '查询失败' });
        }
        const queryParams = [...params, pageSize, offset];
        database_1.db.all(listSql, queryParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ message: '查询失败' });
            }
            res.json({
                list: rows,
                total: countRow?.total || 0,
                page,
                pageSize
            });
        });
    });
});
router.get('/modules', auth_1.authenticate, (0, auth_1.requirePermission)('log:view'), (req, res) => {
    database_1.db.all('SELECT DISTINCT module FROM operation_logs ORDER BY module', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: '查询失败' });
        }
        res.json(rows.map(r => r.module));
    });
});
router.get('/:id', auth_1.authenticate, (0, auth_1.requirePermission)('log:view'), (req, res) => {
    const id = parseInt(req.params.id);
    database_1.db.get('SELECT * FROM operation_logs WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ message: '查询失败' });
        }
        if (!row) {
            return res.status(404).json({ message: '日志不存在' });
        }
        res.json(row);
    });
});
router.delete('/:id', auth_1.authenticate, (0, auth_1.requirePermission)('log:view'), (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ message: '无效的日志ID' });
    }
    database_1.db.run('DELETE FROM operation_logs WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ message: '删除失败' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: '日志不存在' });
        }
        res.json({ message: '删除成功' });
    });
});
router.delete('/', auth_1.authenticate, (0, auth_1.requirePermission)('log:view'), (req, res) => {
    database_1.db.run('DELETE FROM operation_logs', [], function (err) {
        if (err) {
            return res.status(500).json({ message: '清空失败' });
        }
        res.json({ message: '已清空全部日志', deleted: this.changes });
    });
});
exports.default = router;
