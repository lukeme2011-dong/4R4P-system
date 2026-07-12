"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logOperation = void 0;
const database_1 = require("../database");
const urlModuleMap = {
    '/api/auth/login': { module: '认证', action: '登录', description: '用户登录系统' },
    '/api/auth/profile': { module: '个人中心', action: '查看个人信息', description: '查看个人资料' },
    '/api/auth/register': { module: '用户管理', action: '创建用户', description: '创建新用户' },
    '/api/positions': { module: '岗位管理', action: '查看岗位', description: '查看岗位列表' },
    '/api/candidates': { module: '候选人管理', action: '查看候选人', description: '查看候选人列表' },
    '/api/evaluations': { module: '测评管理', action: '查看测评', description: '查看测评列表' },
    '/api/knowledge': { module: '知识库', action: '查看知识', description: '查看知识库列表' },
    '/api/succession': { module: '人才继任', action: '查看继任计划', description: '查看人才继任计划' },
    '/api/performance': { module: '绩效考核', action: '查看考核', description: '查看绩效考核列表' },
    '/api/departments': { module: '部门管理', action: '查看部门', description: '查看部门列表' },
    '/api/permissions/permissions': { module: '权限管理', action: '查看权限', description: '查看权限列表' },
    '/api/permissions/my-permissions': { module: '权限管理', action: '查看我的权限', description: '查看当前用户权限' },
};
const getModuleAndAction = (method, url) => {
    const path = url.split('?')[0];
    if (path.match(/^\/api\/auth\/users\/\d+$/)) {
        if (method === 'PUT')
            return { module: '用户管理', action: '编辑用户', description: '编辑用户信息' };
        if (method === 'DELETE')
            return { module: '用户管理', action: '删除用户', description: '删除用户' };
    }
    if (path === '/api/auth/users' && method === 'GET') {
        return { module: '用户管理', action: '查看用户', description: '查看用户列表' };
    }
    if (path.match(/^\/api\/positions\/\d+$/)) {
        if (method === 'GET')
            return { module: '岗位管理', action: '查看岗位详情', description: '查看岗位详情' };
        if (method === 'PUT')
            return { module: '岗位管理', action: '编辑岗位', description: '编辑岗位信息' };
        if (method === 'DELETE')
            return { module: '岗位管理', action: '删除岗位', description: '删除岗位' };
    }
    if (path === '/api/positions' && method === 'POST') {
        return { module: '岗位管理', action: '创建岗位', description: '创建新岗位' };
    }
    if (path.match(/^\/api\/candidates\/\d+$/)) {
        if (method === 'GET')
            return { module: '候选人管理', action: '查看候选人详情', description: '查看候选人详情' };
        if (method === 'PUT')
            return { module: '候选人管理', action: '编辑候选人', description: '编辑候选人信息' };
        if (method === 'DELETE')
            return { module: '候选人管理', action: '删除候选人', description: '删除候选人' };
    }
    if (path === '/api/candidates' && method === 'POST') {
        return { module: '候选人管理', action: '添加候选人', description: '添加新候选人' };
    }
    if (path.match(/^\/api\/evaluations\/\d+$/)) {
        if (method === 'DELETE')
            return { module: '测评管理', action: '删除测评', description: '删除测评记录' };
    }
    if (path === '/api/evaluations' && method === 'POST') {
        return { module: '测评管理', action: '创建测评', description: '创建新测评' };
    }
    if (path.match(/^\/api\/knowledge\/\d+$/)) {
        if (method === 'GET')
            return { module: '知识库', action: '查看知识详情', description: '查看知识详情' };
        if (method === 'PUT')
            return { module: '知识库', action: '编辑知识', description: '编辑知识内容' };
        if (method === 'DELETE')
            return { module: '知识库', action: '删除知识', description: '删除知识条目' };
    }
    if (path === '/api/knowledge' && method === 'POST') {
        return { module: '知识库', action: '创建知识', description: '创建新知识条目' };
    }
    if (path.match(/^\/api\/succession\/\d+$/)) {
        if (method === 'PUT')
            return { module: '人才继任', action: '编辑继任计划', description: '编辑继任计划' };
        if (method === 'DELETE')
            return { module: '人才继任', action: '删除继任计划', description: '删除继任计划' };
    }
    if (path === '/api/succession' && method === 'POST') {
        return { module: '人才继任', action: '创建继任计划', description: '创建新继任计划' };
    }
    if (path.match(/^\/api\/performance\/\d+$/)) {
        if (method === 'GET')
            return { module: '绩效考核', action: '查看考核详情', description: '查看考核详情' };
        if (method === 'PUT')
            return { module: '绩效考核', action: '编辑考核', description: '编辑考核信息' };
        if (method === 'DELETE')
            return { module: '绩效考核', action: '删除考核', description: '删除考核记录' };
    }
    if (path === '/api/performance' && method === 'POST') {
        return { module: '绩效考核', action: '创建考核', description: '创建新考核' };
    }
    if (path.match(/^\/api\/permissions\/role-permissions\/[^/]+$/) && method === 'POST') {
        return { module: '权限管理', action: '配置角色权限', description: '配置角色权限' };
    }
    if (path.match(/^\/api\/permissions\/position-permissions\/\d+$/) && method === 'POST') {
        return { module: '权限管理', action: '配置职位权限', description: '配置职位权限' };
    }
    if (path.match(/^\/api\/permissions\/user-permissions\/\d+$/) && method === 'POST') {
        return { module: '权限管理', action: '配置用户权限', description: '配置用户个人权限' };
    }
    for (const [pattern, info] of Object.entries(urlModuleMap)) {
        if (path.startsWith(pattern)) {
            return info;
        }
    }
    return { module: '其他', action: '操作', description: path };
};
const shouldSkipLog = (method, url) => {
    const path = url.split('?')[0];
    if (method === 'GET' && path === '/api/health')
        return true;
    if (path.includes('operation-logs'))
        return true;
    if (method === 'GET' && (path.includes('/my-permissions') || path.includes('/profile')))
        return false;
    if (method === 'GET' && (path.match(/\/api\/permissions\/(role|position|user)-permissions\/.*/)))
        return false;
    return false;
};
const logOperation = (req, statusCode, options) => {
    try {
        const method = req.method;
        const url = req.originalUrl || req.url;
        if (shouldSkipLog(method, url))
            return;
        const defaultInfo = getModuleAndAction(method, url);
        const module = options?.module || defaultInfo.module;
        const action = options?.action || defaultInfo.action;
        const description = options?.description || defaultInfo.description;
        const userId = req.user?.id || null;
        const username = req.user?.username || null;
        let realName = null;
        if (req.user) {
            database_1.db.get('SELECT real_name FROM users WHERE id = ?', [req.user.id], (err, row) => {
                if (err || !row) {
                    insertLog(userId, username, null, module, action, description, req, statusCode);
                }
                else {
                    insertLog(userId, username, row.real_name, module, action, description, req, statusCode);
                }
            });
        }
        else {
            insertLog(null, null, null, module, action, description, req, statusCode);
        }
    }
    catch (e) {
        // 日志记录失败不影响主流程
    }
};
exports.logOperation = logOperation;
const insertLog = (userId, username, realName, module, action, description, req, statusCode) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        req.connection?.remoteAddress ||
        null;
    const userAgent = req.headers['user-agent'] || null;
    let requestParams = null;
    try {
        if (Object.keys(req.body || {}).length > 0) {
            const body = { ...req.body };
            if (body.password)
                body.password = '***';
            if (body.newPassword)
                body.newPassword = '***';
            requestParams = JSON.stringify(body);
        }
        else if (Object.keys(req.query || {}).length > 0) {
            requestParams = JSON.stringify(req.query);
        }
    }
    catch (e) {
        requestParams = null;
    }
    database_1.db.run(`INSERT INTO operation_logs
      (user_id, username, real_name, module, action, description, method, url, ip, user_agent, request_params, response_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userId, username, realName, module, action, description, req.method, req.originalUrl || req.url, ip, userAgent, requestParams, statusCode], (err) => {
        if (err) {
            // 静默失败
        }
    });
};
