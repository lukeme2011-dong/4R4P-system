"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: '未授权访问' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: '无效的token' });
    }
};
exports.authenticate = authenticate;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: '权限不足' });
        }
        next();
    };
};
exports.requireRole = requireRole;
const requirePermission = (permissionCode) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: '未授权访问' });
        }
        const userId = req.user.id;
        const userRole = req.user.role;
        if (userRole === 'admin') {
            next();
            return;
        }
        database_1.db.get(`SELECT u.position,
        CASE
          WHEN up_deny.id IS NOT NULL THEN 0
          WHEN up_allow.id IS NOT NULL THEN 1
          WHEN pp.id IS NOT NULL THEN 1
          WHEN rp.id IS NOT NULL THEN 1
          ELSE 0
        END as has_permission
       FROM users u
       LEFT JOIN role_permissions rp ON rp.role = u.role
       LEFT JOIN permissions rp_p ON rp_p.id = rp.permission_id AND rp_p.code = ?
       LEFT JOIN position_permissions pp ON pp.position_id = u.position
       LEFT JOIN permissions pp_p ON pp_p.id = pp.permission_id AND pp_p.code = ?
       LEFT JOIN user_permissions up_allow ON up_allow.user_id = u.id AND up_allow.permission_type = 'allow'
       LEFT JOIN permissions upa_p ON upa_p.id = up_allow.permission_id AND upa_p.code = ?
       LEFT JOIN user_permissions up_deny ON up_deny.user_id = u.id AND up_deny.permission_type = 'deny'
       LEFT JOIN permissions upd_p ON upd_p.id = up_deny.permission_id AND upd_p.code = ?
       WHERE u.id = ?
       LIMIT 1`, [permissionCode, permissionCode, permissionCode, permissionCode, userId], (err, row) => {
            if (err) {
                return res.status(500).json({ message: '权限检查失败' });
            }
            if (!row || row.has_permission !== 1) {
                return res.status(403).json({ message: '权限不足' });
            }
            next();
        });
    };
};
exports.requirePermission = requirePermission;
