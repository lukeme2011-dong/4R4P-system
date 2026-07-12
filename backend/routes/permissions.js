"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ========== 权限点管理 ==========
// 获取所有权限点（按模块分组）
router.get('/permissions', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    database_1.db.all('SELECT * FROM permissions ORDER BY sort_order, id', (err, permissions) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        const grouped = {};
        permissions.forEach((p) => {
            if (!grouped[p.module]) {
                grouped[p.module] = [];
            }
            grouped[p.module].push(p);
        });
        res.json({ list: permissions, grouped });
    });
});
// 添加权限点
router.post('/permissions', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const { code, name, module, description, sort_order } = req.body;
    database_1.db.run('INSERT INTO permissions (code, name, module, description, sort_order) VALUES (?, ?, ?, ?, ?)', [code, name, module, description || '', sort_order || 0], function (err) {
        if (err) {
            return res.status(400).json({ message: '权限编码已存在' });
        }
        res.status(201).json({ id: this.lastID, message: '权限点创建成功' });
    });
});
// 更新权限点
router.put('/permissions/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const { code, name, module, description, sort_order } = req.body;
    const id = parseInt(req.params.id);
    database_1.db.run('UPDATE permissions SET code = ?, name = ?, module = ?, description = ?, sort_order = ? WHERE id = ?', [code, name, module, description || '', sort_order || 0, id], function (err) {
        if (err) {
            return res.status(400).json({ message: '更新失败，权限编码可能重复' });
        }
        res.json({ message: '权限点更新成功' });
    });
});
// 删除权限点
router.delete('/permissions/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    database_1.db.serialize(() => {
        database_1.db.run('DELETE FROM role_permissions WHERE permission_id = ?', [id]);
        database_1.db.run('DELETE FROM position_permissions WHERE permission_id = ?', [id]);
        database_1.db.run('DELETE FROM user_permissions WHERE permission_id = ?', [id]);
        database_1.db.run('DELETE FROM permissions WHERE id = ?', [id], function (err) {
            if (err) {
                return res.status(500).json({ message: '删除失败' });
            }
            res.json({ message: '权限点删除成功' });
        });
    });
});
// ========== 角色权限管理 ==========
// 获取角色权限
router.get('/role-permissions/:role', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const role = req.params.role;
    database_1.db.all(`SELECT p.* FROM permissions p 
     INNER JOIN role_permissions rp ON p.id = rp.permission_id 
     WHERE rp.role = ?
     ORDER BY p.sort_order, p.id`, [role], (err, permissions) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(permissions);
    });
});
// 保存角色权限
router.post('/role-permissions/:role', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const role = req.params.role;
    const { permission_ids } = req.body;
    database_1.db.serialize(() => {
        database_1.db.run('DELETE FROM role_permissions WHERE role = ?', [role], (deleteErr) => {
            if (deleteErr) {
                return res.status(500).json({ message: '删除旧权限失败' });
            }
            if (permission_ids && permission_ids.length > 0) {
                const stmt = database_1.db.prepare('INSERT INTO role_permissions (role, permission_id) VALUES (?, ?)');
                let completed = 0;
                let hasError = false;
                permission_ids.forEach((pid) => {
                    stmt.run(role, pid, function (err) {
                        if (hasError)
                            return;
                        if (err) {
                            hasError = true;
                            return res.status(500).json({ message: '添加权限失败' });
                        }
                        completed++;
                        if (completed === permission_ids.length) {
                            stmt.finalize();
                            res.json({ message: '角色权限保存成功' });
                        }
                    });
                });
            }
            else {
                res.json({ message: '角色权限保存成功' });
            }
        });
    });
});
// ========== 职位权限管理 ==========
// 获取职位权限
router.get('/position-permissions/:positionId', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const positionId = parseInt(req.params.positionId);
    database_1.db.all(`SELECT p.* FROM permissions p 
     INNER JOIN position_permissions pp ON p.id = pp.permission_id 
     WHERE pp.position_id = ?
     ORDER BY p.sort_order, p.id`, [positionId], (err, permissions) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(permissions);
    });
});
// 保存职位权限
router.post('/position-permissions/:positionId', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const positionId = parseInt(req.params.positionId);
    const { permission_ids } = req.body;
    database_1.db.serialize(() => {
        database_1.db.run('DELETE FROM position_permissions WHERE position_id = ?', [positionId], (deleteErr) => {
            if (deleteErr) {
                return res.status(500).json({ message: '删除旧权限失败' });
            }
            if (permission_ids && permission_ids.length > 0) {
                const stmt = database_1.db.prepare('INSERT INTO position_permissions (position_id, permission_id) VALUES (?, ?)');
                let completed = 0;
                let hasError = false;
                permission_ids.forEach((pid) => {
                    stmt.run(positionId, pid, function (err) {
                        if (hasError)
                            return;
                        if (err) {
                            hasError = true;
                            return res.status(500).json({ message: '添加权限失败' });
                        }
                        completed++;
                        if (completed === permission_ids.length) {
                            stmt.finalize();
                            res.json({ message: '职位权限保存成功' });
                        }
                    });
                });
            }
            else {
                res.json({ message: '职位权限保存成功' });
            }
        });
    });
});
// ========== 用户权限管理 ==========
// 获取用户权限（包含角色、职位、个人权限的合并结果）
router.get('/user-permissions/:userId', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const userId = parseInt(req.params.userId);
    database_1.db.get('SELECT * FROM users WHERE id = ?', [userId], (userErr, user) => {
        if (userErr) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        database_1.db.all(`SELECT DISTINCT p.*, 
        CASE 
          WHEN up.permission_type = 'deny' THEN 'deny'
          WHEN up.permission_type = 'allow' THEN 'allow_user'
          WHEN pp.id IS NOT NULL THEN 'allow_position'
          WHEN rp.id IS NOT NULL THEN 'allow_role'
          ELSE 'deny'
        END as source,
        up.permission_type as user_type
       FROM permissions p
       LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role = ?
       LEFT JOIN position_permissions pp ON p.id = pp.permission_id AND pp.position_id = ?
       LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
       ORDER BY p.sort_order, p.id`, [user.role, user.position ? 0 : 0, userId], (err, permissions) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            res.json({ user, permissions });
        });
    });
});
// 获取用户个人特殊权限
router.get('/user-permissions/:userId/direct', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const userId = parseInt(req.params.userId);
    database_1.db.all(`SELECT p.*, up.permission_type 
     FROM permissions p 
     INNER JOIN user_permissions up ON p.id = up.permission_id 
     WHERE up.user_id = ?
     ORDER BY p.sort_order, p.id`, [userId], (err, permissions) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(permissions);
    });
});
// 保存用户个人权限
router.post('/user-permissions/:userId', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const userId = parseInt(req.params.userId);
    const { permissions } = req.body;
    database_1.db.serialize(() => {
        database_1.db.run('DELETE FROM user_permissions WHERE user_id = ?', [userId], (deleteErr) => {
            if (deleteErr) {
                return res.status(500).json({ message: '删除旧权限失败' });
            }
            if (permissions && permissions.length > 0) {
                const stmt = database_1.db.prepare('INSERT INTO user_permissions (user_id, permission_id, permission_type) VALUES (?, ?, ?)');
                let completed = 0;
                let hasError = false;
                permissions.forEach((perm) => {
                    stmt.run(userId, perm.id, perm.type || 'allow', function (err) {
                        if (hasError)
                            return;
                        if (err) {
                            hasError = true;
                            return res.status(500).json({ message: '添加权限失败' });
                        }
                        completed++;
                        if (completed === permissions.length) {
                            stmt.finalize();
                            res.json({ message: '用户权限保存成功' });
                        }
                    });
                });
            }
            else {
                res.json({ message: '用户权限保存成功' });
            }
        });
    });
});
// ========== 获取当前用户的所有权限 ==========
router.get('/my-permissions', auth_1.authenticate, (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    database_1.db.get('SELECT position, department FROM users WHERE id = ?', [userId], (userErr, user) => {
        if (userErr || !user) {
            return res.status(500).json({ message: '获取用户信息失败' });
        }
        const positionId = user.position || 0;
        database_1.db.all(`SELECT DISTINCT p.code, p.name, p.module,
        CASE 
          WHEN up.permission_type = 'deny' THEN 0
          WHEN up.permission_type = 'allow' THEN 1
          WHEN pp.id IS NOT NULL THEN 1
          WHEN rp.id IS NOT NULL THEN 1
          WHEN ? = 'admin' THEN 1
          ELSE 0
        END as has_permission
       FROM permissions p
       LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role = ?
       LEFT JOIN position_permissions pp ON p.id = pp.permission_id AND pp.position_id = ?
       LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
       WHERE p.code IS NOT NULL`, [userRole, userRole, positionId, userId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: '服务器错误' });
            }
            const permissionCodes = [];
            results.forEach(r => {
                if (r.has_permission === 1) {
                    permissionCodes.push(r.code);
                }
            });
            res.json({
                permissions: permissionCodes,
                permission_list: results
            });
        });
    });
});
exports.default = router;
