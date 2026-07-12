"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const paths_1 = require("../utils/paths");
const router = express_1.default.Router();
// 照片上传配置
const avatarStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = path_1.default.join((0, paths_1.getUploadsDir)(), 'avatars');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const userId = req.user?.id || 'unknown';
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `avatar_${userId}_${Date.now()}${ext}`);
    }
});
const avatarUpload = (0, multer_1.default)({
    storage: avatarStorage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('照片格式必须为JPG或JPEG'));
        }
    }
});
const insertOperationLog = (userId, username, realName, module, action, description, req, statusCode) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.ip ||
            req.connection?.remoteAddress ||
            null;
        const userAgent = req.headers['user-agent'] || null;
        database_1.db.run(`INSERT INTO operation_logs
        (user_id, username, real_name, module, action, description, method, url, ip, user_agent, response_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userId, username, realName, module, action, description, req.method, req.originalUrl || req.url, ip, userAgent, statusCode]);
    }
    catch (e) {
        // 静默失败
    }
};
const getUserPermissions = (userId, callback) => {
    database_1.db.all(`SELECT DISTINCT p.code
     FROM permissions p
     WHERE p.id IN (
       SELECT rp.permission_id FROM role_permissions rp
       INNER JOIN users u ON u.role = rp.role
       WHERE u.id = ?
       UNION
       SELECT pp.permission_id FROM position_permissions pp
       INNER JOIN users u ON u.position = pp.position_id
       WHERE u.id = ?
       UNION
       SELECT up.permission_id FROM user_permissions up
       WHERE up.user_id = ? AND up.permission_type = 'allow'
     )
     AND p.id NOT IN (
       SELECT up.permission_id FROM user_permissions up
       WHERE up.user_id = ? AND up.permission_type = 'deny'
     )`, [userId, userId, userId, userId], (err, rows) => {
        if (err) {
            callback([]);
            return;
        }
        callback(rows.map(r => r.code));
    });
};
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    database_1.db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!user) {
            insertOperationLog(null, username, null, '认证', '登录失败', '用户名不存在', req, 401);
            return res.status(401).json({ message: '用户名或密码错误' });
        }
        bcryptjs_1.default.compare(password, user.password, (compareErr, isMatch) => {
            if (compareErr) {
                return res.status(500).json({ message: '服务器错误' });
            }
            if (!isMatch) {
                insertOperationLog(user.id, user.username, user.real_name, '认证', '登录失败', '密码错误', req, 401);
                return res.status(401).json({ message: '用户名或密码错误' });
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
            getUserPermissions(user.id, (permissions) => {
                insertOperationLog(user.id, user.username, user.real_name, '认证', '登录', '用户登录系统', req, 200);
                res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        real_name: user.real_name,
                        role: user.role,
                        department: user.department,
                        position: user.position,
                        avatar: user.avatar || null
                    },
                    permissions
                });
            });
        });
    });
});
router.get('/profile', auth_1.authenticate, (req, res) => {
    const userId = req.user.id;
    database_1.db.get(`SELECT id, username, real_name, role, department, position, email, phone,
     gender, education, ethnicity, political_status, id_card,
     birth_year, birth_month, birth_day, id_province, id_city,
     address, bio, avatar
     FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        getUserPermissions(userId, (permissions) => {
            res.json({ ...user, permissions });
        });
    });
});
router.put('/profile', auth_1.authenticate, (req, res) => {
    const userId = req.user.id;
    const { real_name, email, phone, gender, education, ethnicity, political_status, id_card, birth_year, birth_month, birth_day, id_province, id_city, address, bio } = req.body;
    if (!real_name || real_name.trim() === '') {
        return res.status(400).json({ message: '真实姓名不能为空' });
    }
    database_1.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        database_1.db.run(`UPDATE users SET
        real_name = ?, email = ?, phone = ?,
        gender = ?, education = ?, ethnicity = ?, political_status = ?,
        id_card = ?, birth_year = ?, birth_month = ?, birth_day = ?,
        id_province = ?, id_city = ?, address = ?, bio = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
            real_name.trim(),
            email || null,
            phone || null,
            gender || null,
            education || null,
            ethnicity || null,
            political_status || null,
            id_card || null,
            birth_year || null,
            birth_month || null,
            birth_day || null,
            id_province || null,
            id_city || null,
            address || null,
            bio || null,
            userId
        ], function (updateErr) {
            if (updateErr) {
                insertOperationLog(userId, user.username, user.real_name, '个人中心', '修改资料', '修改个人资料失败', req, 500);
                return res.status(500).json({ message: '更新失败' });
            }
            insertOperationLog(userId, user.username, user.real_name, '个人中心', '修改资料', '修改个人资料成功', req, 200);
            res.json({ message: '资料修改成功' });
        });
    });
});
// 照片上传接口
router.post('/avatar', auth_1.authenticate, avatarUpload.single('avatar'), (req, res) => {
    const userId = req.user.id;
    if (!req.file) {
        return res.status(400).json({ message: '请上传照片' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    database_1.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        // 删除旧照片文件
        if (user.avatar) {
            const oldPath = path_1.default.join(paths_1.BASE_DIR, user.avatar);
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        database_1.db.run('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, userId], function (updateErr) {
            if (updateErr) {
                return res.status(500).json({ message: '照片上传失败' });
            }
            insertOperationLog(userId, user.username, user.real_name, '个人中心', '上传照片', '上传个人照片成功', req, 200);
            res.json({ message: '照片上传成功', avatar: avatarUrl });
        });
    });
});
router.put('/password', auth_1.authenticate, (req, res) => {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
        return res.status(400).json({ message: '原密码和新密码不能为空' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ message: '新密码长度不能少于6位' });
    }
    database_1.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        bcryptjs_1.default.compare(old_password, user.password, (compareErr, isMatch) => {
            if (compareErr) {
                return res.status(500).json({ message: '服务器错误' });
            }
            if (!isMatch) {
                insertOperationLog(userId, user.username, user.real_name, '个人中心', '修改密码', '原密码错误', req, 400);
                return res.status(400).json({ message: '原密码错误' });
            }
            bcryptjs_1.default.hash(new_password, 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                    return res.status(500).json({ message: '服务器错误' });
                }
                database_1.db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, userId], function (updateErr) {
                    if (updateErr) {
                        insertOperationLog(userId, user.username, user.real_name, '个人中心', '修改密码', '修改密码失败', req, 500);
                        return res.status(500).json({ message: '更新失败' });
                    }
                    insertOperationLog(userId, user.username, user.real_name, '个人中心', '修改密码', '修改密码成功', req, 200);
                    res.json({ message: '密码修改成功' });
                });
            });
        });
    });
});
router.get('/users', auth_1.authenticate, (req, res) => {
    database_1.db.all('SELECT id, username, real_name, role, department, position, email, phone FROM users', (err, users) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        res.json(users);
    });
});
// 获取下一个自动生成的用户名
router.get('/users/next-username', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    database_1.db.all('SELECT username FROM users WHERE username LIKE "user%"', (err, users) => {
        if (err) {
            return res.status(500).json({ message: '服务器错误' });
        }
        let maxNum = 0;
        users.forEach(u => {
            const match = u.username?.match(/^user(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNum)
                    maxNum = num;
            }
        });
        const nextNum = maxNum + 1;
        const nextUsername = 'user' + String(nextNum).padStart(5, '0');
        res.json({ username: nextUsername });
    });
});
router.post('/register', auth_1.authenticate, (req, res) => {
    const { username, password, real_name, role, department, position } = req.body;
    if (!username || !/^user\d{5}$/.test(username)) {
        return res.status(400).json({ message: '用户名格式必须为user+5位数字（如user00001）' });
    }
    bcryptjs_1.default.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
            return res.status(500).json({ message: '服务器错误' });
        }
        database_1.db.run('INSERT INTO users (username, password, real_name, role, department, position) VALUES (?, ?, ?, ?, ?, ?)', [username, hashedPassword, real_name, role || 'employee', department, position], (err) => {
            if (err) {
                return res.status(400).json({ message: '用户名已存在' });
            }
            res.status(201).json({ message: '用户创建成功' });
        });
    });
});
router.put('/users/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const { real_name, role, department, position, email, phone, password } = req.body;
    if (password) {
        bcryptjs_1.default.hash(password, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                return res.status(500).json({ message: '服务器错误' });
            }
            database_1.db.run('UPDATE users SET real_name = ?, role = ?, department = ?, position = ?, email = ?, phone = ?, password = ? WHERE id = ?', [real_name, role, department, position, email, phone, hashedPassword, id], function (err) {
                if (err) {
                    return res.status(500).json({ message: '更新失败' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: '用户不存在' });
                }
                res.json({ message: '用户更新成功' });
            });
        });
    }
    else {
        database_1.db.run('UPDATE users SET real_name = ?, role = ?, department = ?, position = ?, email = ?, phone = ? WHERE id = ?', [real_name, role, department, position, email, phone, id], function (err) {
            if (err) {
                return res.status(500).json({ message: '更新失败' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: '用户不存在' });
            }
            res.json({ message: '用户更新成功' });
        });
    }
});
router.delete('/users/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    database_1.db.get('SELECT * FROM users WHERE id = ?', [id], (getErr, user) => {
        if (getErr) {
            return res.status(500).json({ message: '服务器错误' });
        }
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        database_1.db.run('DELETE FROM user_permissions WHERE user_id = ?', [id], (permErr) => {
            if (permErr) {
                return res.status(500).json({ message: '删除权限记录失败' });
            }
            database_1.db.run('DELETE FROM users WHERE id = ?', [id], function (deleteErr) {
                if (deleteErr) {
                    return res.status(500).json({ message: '删除失败' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: '用户不存在' });
                }
                res.json({ message: '用户删除成功' });
            });
        });
    });
});
router.post('/users/import', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), (req, res) => {
    const users = req.body.users;
    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ message: '导入数据不能为空' });
    }
    const defaultPassword = '123456';
    const hashedPassword = bcryptjs_1.default.hashSync(defaultPassword, 10);
    let success = 0;
    let failed = 0;
    const errors = [];
    const importOne = (index) => {
        if (index >= users.length) {
            return res.json({
                message: `导入完成：成功${success}条，失败${failed}条`,
                success,
                failed,
                errors
            });
        }
        const u = users[index];
        if (!u.username || !/^user\d{5}$/.test(u.username)) {
            failed++;
            errors.push(`第${index + 1}行：用户名格式必须为user+5位数字（如user00001）`);
            importOne(index + 1);
            return;
        }
        if (!u.real_name) {
            failed++;
            errors.push(`第${index + 1}行：姓名不能为空`);
            importOne(index + 1);
            return;
        }
        database_1.db.run('INSERT INTO users (username, password, real_name, role, department, position, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [u.username, hashedPassword, u.real_name, u.role || 'candidate', u.department || '', u.position || '被测人', u.email || '', u.phone || ''], (err) => {
            if (err) {
                failed++;
                errors.push(`第${index + 1}行：用户名${u.username}已存在`);
            }
            else {
                success++;
            }
            importOne(index + 1);
        });
    };
    importOne(0);
});
exports.default = router;
