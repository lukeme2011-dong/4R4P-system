"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migratePermissions = exports.initPermissionData = exports.seedData = void 0;
const index_1 = require("./index");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const seedData = () => {
    index_1.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
            console.error('查询用户数量失败:', err.message);
            return;
        }
        if (!row || row.count > 0) {
            return;
        }
        const adminPassword = bcryptjs_1.default.hashSync('admin123', 10);
        const hrPassword = bcryptjs_1.default.hashSync('hr123', 10);
        const empPassword = bcryptjs_1.default.hashSync('emp123', 10);
        index_1.db.run(`INSERT INTO users (username, password, real_name, role, department, position) VALUES
      ('admin', '${adminPassword}', '系统管理员', 'admin', '管理层', '总经理'),
      ('hr_manager', '${hrPassword}', '张HR', 'hr', '人力资源部', 'HR经理'),
      ('employee001', '${empPassword}', '李明', 'employee', '技术部', '前端工程师')
    `);
        index_1.db.run(`INSERT INTO departments (name, description) VALUES
      ('人力资源部', '负责公司人力资源管理'),
      ('技术部', '负责技术研发'),
      ('市场部', '负责市场推广'),
      ('财务部', '负责财务管理'),
      ('销售部', '负责产品销售')
    `);
        index_1.db.run(`INSERT INTO positions (name, department_id, level, r1_weight, r2_weight, r3_weight, r4_weight, description) VALUES
      ('前端工程师', 2, '基层', 40, 35, 15, 10, '负责前端开发'),
      ('后端工程师', 2, '基层', 40, 35, 15, 10, '负责后端开发'),
      ('技术主管', 2, '骨干', 30, 30, 25, 15, '负责技术团队管理'),
      ('技术经理', 2, '中层', 25, 25, 25, 25, '负责技术部门管理'),
      ('销售代表', 5, '基层', 25, 45, 20, 10, '负责产品销售'),
      ('销售主管', 5, '骨干', 20, 40, 25, 15, '负责销售团队管理'),
      ('财务专员', 4, '基层', 50, 30, 10, 10, '负责财务核算'),
      ('HR专员', 1, '基层', 35, 30, 25, 10, '负责人力资源日常工作')
    `);
        index_1.db.run(`INSERT INTO keywords (word, r_type, score) VALUES
      ('遵守', 'r1', 3), ('规范', 'r1', 3), ('合规', 'r1', 3), ('准时', 'r1', 3), ('制度', 'r1', 3),
      ('违规', 'r1', 1), ('迟到', 'r1', 1), ('早退', 'r1', 1), ('失误', 'r1', 1), ('马虎', 'r1', 1),
      ('完成', 'r2', 3), ('达标', 'r2', 3), ('优秀', 'r2', 3), ('创新', 'r2', 3), ('效率', 'r2', 3),
      ('未完成', 'r2', 1), ('落后', 'r2', 1), ('拖延', 'r2', 1), ('低效', 'r2', 1), ('懈怠', 'r2', 1),
      ('协作', 'r3', 3), ('配合', 'r3', 3), ('帮助', 'r3', 3), ('沟通', 'r3', 3), ('支持', 'r3', 3),
      ('拒绝', 'r3', 1), ('冷漠', 'r3', 1), ('孤立', 'r3', 1), ('冲突', 'r3', 1), ('自私', 'r3', 1),
      ('大局', 'r4', 3), ('使命', 'r4', 3), ('愿景', 'r4', 3), ('担当', 'r4', 3), ('奉献', 'r4', 3),
      ('私利', 'r4', 1), ('狭隘', 'r4', 1), ('短视', 'r4', 1), ('逃避', 'r4', 1), ('推诿', 'r4', 1)
    `);
        index_1.db.run(`INSERT INTO interview_questions (r_type, question) VALUES
      ('r1', '请描述一次你严格遵守公司制度的经历'),
      ('r1', '当你发现同事违反规定时，你会怎么做？'),
      ('r1', '你如何理解"没有规矩不成方圆"这句话？'),
      ('r2', '请分享一次你超越目标完成任务的经历'),
      ('r2', '当任务遇到困难时，你会如何应对？'),
      ('r2', '你如何设定自己的工作目标？'),
      ('r3', '请描述一次你帮助同事完成任务的经历'),
      ('r3', '团队合作中出现分歧时，你会如何处理？'),
      ('r3', '你如何看待团队协作的重要性？'),
      ('r4', '请分享一次你为了公司利益牺牲个人利益的经历'),
      ('r4', '你如何理解公司的使命和愿景？'),
      ('r4', '面对短期利益和长期发展的冲突，你会如何选择？')
    `);
        index_1.db.run(`INSERT INTO knowledge_base (title, content, category, tags) VALUES
      ('R1(-1)问题处理方案', '短期（1-7天）：制度培训；中期（1-30天）：流程规范；长期（30-90天）：文化融入', '整改方案', 'R1,违规'),
      ('R2(L)能力提升建议', '1. 制定能力提升计划；2. 安排导师辅导；3. 定期评估进度', '发展建议', 'R2,能力'),
      ('R3(0)冷漠改进策略', '1. 团队建设活动；2. 沟通技巧培训；3. 正向激励引导', '整改方案', 'R3,协作'),
      ('《大学》管理智慧', '格物、致知、诚意、正心、修身、齐家、治国、平天下', '经典解读', '大学,修身'),
      ('阳明心学与责任', '心即理、知行合一、致良知', '经典解读', '阳明心学,良知'),
      ('绩效面谈话术-R1', '观察到具体行为，而非主观评价', '话术库', '绩效面谈,R1'),
      ('绩效面谈话术-R2', '关注结果数据，提出改进目标', '话术库', '绩效面谈,R2')
    `);
        index_1.db.run(`INSERT INTO evaluation_questions (r_type, question, options, correct_answer, score, category) VALUES
      ('r1', '公司规定上班时间为9:00，你通常几点到公司？', '["A. 提前15分钟以上到岗","B. 准时到岗","C. 偶尔迟到5分钟内","D. 经常迟到"]', 'A', 10, 'r1基础'),
      ('r1', '当你发现工作流程存在漏洞时，你会怎么做？', '["A. 立即向上级汇报并提出改进建议","B. 自己悄悄调整","C. 假装没看见","D. 等别人发现"]', 'A', 10, 'r1基础'),
      ('r1', '你如何看待公司的规章制度？', '["A. 必须严格遵守，是底线","B. 重要的遵守，不重要的可以灵活","C. 有时候需要打破规则","D. 规则是给普通人定的"]', 'A', 10, 'r1基础'),
      ('r2', '面对一项具有挑战性的任务，你的态度是？', '["A. 主动承担，争取超额完成","B. 接受任务，尽力完成","C. 推脱，找理由不做","D. 敷衍了事"]', 'A', 10, 'r2基础'),
      ('r2', '你如何设定自己的工作目标？', '["A. 设定超出预期的高目标","B. 设定符合预期的目标","C. 设定容易完成的低目标","D. 不设定目标"]', 'A', 10, 'r2基础'),
      ('r2', '当任务遇到困难时，你会？', '["A. 坚持不懈，寻找解决方案","B. 尝试几次，不行就放弃","C. 直接放弃","D. 抱怨环境不好"]', 'A', 10, 'r2基础'),
      ('r3', '当同事需要帮助时，你会？', '["A. 主动提供帮助","B. 被请求时才帮忙","C. 找借口推脱","D. 幸灾乐祸"]', 'A', 10, 'r3基础'),
      ('r3', '团队合作中出现分歧时，你会？', '["A. 积极沟通，寻求共识","B. 坚持自己的观点","C. 沉默不语","D. 激化矛盾"]', 'A', 10, 'r3基础'),
      ('r3', '你如何看待团队协作？', '["A. 团队成功才是真的成功","B. 做好自己的事就行","C. 别人的事与我无关","D. 团队就是搭便车的地方"]', 'A', 10, 'r3基础'),
      ('r4', '面对公司利益和个人利益冲突时，你会？', '["A. 优先考虑公司利益","B. 平衡两者","C. 优先考虑个人利益","D. 只考虑个人利益"]', 'A', 10, 'r4基础'),
      ('r4', '你如何理解公司的使命和愿景？', '["A. 是行动指引，时刻铭记","B. 听听就好，跟我没关系","C. 是画饼，不现实","D. 纯属忽悠"]', 'A', 10, 'r4基础'),
      ('r4', '面对短期利益和长期发展的冲突，你会？', '["A. 着眼长远，牺牲短期利益","B. 两者兼顾","C. 选择短期利益","D. 只看眼前"]', 'A', 10, 'r4基础')
    `);
        index_1.db.run(`INSERT INTO permissions (code, name, module, sort_order) VALUES
      ('dashboard:view', '数据看板查看', '数据看板', 1),
      ('position:view', '岗位列表查看', '岗位管理', 10),
      ('position:create', '创建岗位', '岗位管理', 11),
      ('position:edit', '编辑岗位', '岗位管理', 12),
      ('position:delete', '删除岗位', '岗位管理', 13),
      ('candidate:view', '候选人查看', '候选人管理', 20),
      ('candidate:create', '添加候选人', '候选人管理', 21),
      ('candidate:edit', '编辑候选人', '候选人管理', 22),
      ('candidate:delete', '删除候选人', '候选人管理', 23),
      ('evaluation:view', '测评管理查看', '测评管理', 30),
      ('evaluation:create', '创建测评', '测评管理', 31),
      ('evaluation:delete', '删除测评', '测评管理', 32),
      ('questionbank:view', '题库管理查看', '题库管理', 40),
      ('questionbank:import', '导入试题', '题库管理', 41),
      ('questionbank:edit', '编辑试题', '题库管理', 42),
      ('questionbank:delete', '删除试题', '题库管理', 43),
      ('assessment:view', '测评档案查看', '测评档案', 50),
      ('assessment:export', '测评档案导出', '测评档案', 51),
      ('assessment:delete', '删除测评记录', '测评档案', 52),
      ('weight:view', '岗位权重查看', '岗位权重', 60),
      ('weight:edit', '岗位权重配置', '岗位权重', 61),
      ('performance:view', '绩效考核查看', '绩效考核', 70),
      ('performance:create', '创建考核', '绩效考核', 71),
      ('performance:edit', '编辑考核', '绩效考核', 72),
      ('performance:delete', '删除考核', '绩效考核', 73),
      ('personality:test', '责任性格测评', '性格测评', 80),
      ('succession:view', '人才继任查看', '人才继任', 90),
      ('succession:edit', '编辑继任计划', '人才继任', 91),
      ('succession:delete', '删除继任计划', '人才继任', 92),
      ('knowledge:view', '知识库查看', '知识库', 100),
      ('knowledge:create', '创建知识', '知识库', 101),
      ('knowledge:edit', '编辑知识', '知识库', 102),
      ('knowledge:delete', '删除知识', '知识库', 103),
      ('user:view', '用户管理查看', '用户管理', 110),
      ('user:create', '创建用户', '用户管理', 111),
      ('user:edit', '编辑用户', '用户管理', 112),
      ('user:delete', '删除用户', '用户管理', 113),
      ('permission:view', '权限管理查看', '权限管理', 120),
      ('permission:edit', '配置权限', '权限管理', 121),
      ('log:view', '操作日志查看', '操作日志', 140),
      ('profile:view', '个人中心查看', '个人中心', 130),
      ('profile:edit', '编辑个人信息', '个人中心', 131)
    `);
        index_1.db.run(`INSERT INTO role_permissions (role, permission_id) VALUES
      ('admin', 1), ('admin', 2), ('admin', 3), ('admin', 4), ('admin', 5),
      ('admin', 6), ('admin', 7), ('admin', 8), ('admin', 9), ('admin', 10),
      ('admin', 11), ('admin', 12), ('admin', 13), ('admin', 14), ('admin', 15),
      ('admin', 16), ('admin', 17), ('admin', 18), ('admin', 19), ('admin', 20),
      ('admin', 21), ('admin', 22), ('admin', 23), ('admin', 24), ('admin', 25),
      ('admin', 26), ('admin', 27), ('admin', 28), ('admin', 29), ('admin', 30),
      ('admin', 31), ('admin', 32), ('admin', 33), ('admin', 34), ('admin', 35),
      ('admin', 36), ('admin', 37), ('admin', 38), ('admin', 39), ('admin', 40),
      ('hr', 1), ('hr', 2), ('hr', 3), ('hr', 4), ('hr', 5),
      ('hr', 6), ('hr', 7), ('hr', 8), ('hr', 9), ('hr', 10),
      ('hr', 11), ('hr', 12), ('hr', 13), ('hr', 14), ('hr', 15),
      ('hr', 16), ('hr', 17), ('hr', 18), ('hr', 19), ('hr', 20),
      ('hr', 21), ('hr', 22), ('hr', 23), ('hr', 24), ('hr', 25),
      ('hr', 26), ('hr', 27), ('hr', 28), ('hr', 29), ('hr', 30),
      ('hr', 31), ('hr', 32), ('hr', 33),
      ('employee', 1), ('employee', 26), ('employee', 38), ('employee', 39),
      ('candidate', 1), ('candidate', 17), ('candidate', 26), ('candidate', 38), ('candidate', 39)
    `);
        console.log('初始数据已导入');
    });
};
exports.seedData = seedData;
const initPermissionData = () => {
    index_1.db.get('SELECT COUNT(*) as count FROM permissions', (err, row) => {
        if (err) {
            console.error('查询权限数量失败:', err.message);
            return;
        }
        if (!row || row.count > 0) {
            (0, exports.migratePermissions)();
            return;
        }
        index_1.db.run(`INSERT INTO permissions (code, name, module, sort_order) VALUES
      ('dashboard:view', '数据看板查看', '数据看板', 1),
      ('position:view', '岗位列表查看', '岗位管理', 10),
      ('position:create', '创建岗位', '岗位管理', 11),
      ('position:edit', '编辑岗位', '岗位管理', 12),
      ('position:delete', '删除岗位', '岗位管理', 13),
      ('candidate:view', '候选人查看', '候选人管理', 20),
      ('candidate:create', '添加候选人', '候选人管理', 21),
      ('candidate:edit', '编辑候选人', '候选人管理', 22),
      ('candidate:delete', '删除候选人', '候选人管理', 23),
      ('evaluation:view', '测评管理查看', '测评管理', 30),
      ('evaluation:create', '创建测评', '测评管理', 31),
      ('evaluation:delete', '删除测评', '测评管理', 32),
      ('questionbank:view', '题库管理查看', '题库管理', 40),
      ('questionbank:import', '导入试题', '题库管理', 41),
      ('questionbank:edit', '编辑试题', '题库管理', 42),
      ('questionbank:delete', '删除试题', '题库管理', 43),
      ('assessment:view', '测评档案查看', '测评档案', 50),
      ('assessment:export', '测评档案导出', '测评档案', 51),
      ('assessment:delete', '删除测评记录', '测评档案', 52),
      ('weight:view', '岗位权重查看', '岗位权重', 60),
      ('weight:edit', '岗位权重配置', '岗位权重', 61),
      ('performance:view', '绩效考核查看', '绩效考核', 70),
      ('performance:create', '创建考核', '绩效考核', 71),
      ('performance:edit', '编辑考核', '绩效考核', 72),
      ('performance:delete', '删除考核', '绩效考核', 73),
      ('personality:test', '责任性格测评', '性格测评', 80),
      ('succession:view', '人才继任查看', '人才继任', 90),
      ('succession:edit', '编辑继任计划', '人才继任', 91),
      ('succession:delete', '删除继任计划', '人才继任', 92),
      ('knowledge:view', '知识库查看', '知识库', 100),
      ('knowledge:create', '创建知识', '知识库', 101),
      ('knowledge:edit', '编辑知识', '知识库', 102),
      ('knowledge:delete', '删除知识', '知识库', 103),
      ('user:view', '用户管理查看', '用户管理', 110),
      ('user:create', '创建用户', '用户管理', 111),
      ('user:edit', '编辑用户', '用户管理', 112),
      ('user:delete', '删除用户', '用户管理', 113),
      ('permission:view', '权限管理查看', '权限管理', 120),
      ('permission:edit', '配置权限', '权限管理', 121),
      ('log:view', '操作日志查看', '操作日志', 140),
      ('profile:view', '个人中心查看', '个人中心', 130),
      ('profile:edit', '编辑个人信息', '个人中心', 131)
    `);
        index_1.db.run(`INSERT INTO role_permissions (role, permission_id) VALUES
      ('admin', 1), ('admin', 2), ('admin', 3), ('admin', 4), ('admin', 5),
      ('admin', 6), ('admin', 7), ('admin', 8), ('admin', 9), ('admin', 10),
      ('admin', 11), ('admin', 12), ('admin', 13), ('admin', 14), ('admin', 15),
      ('admin', 16), ('admin', 17), ('admin', 18), ('admin', 19), ('admin', 20),
      ('admin', 21), ('admin', 22), ('admin', 23), ('admin', 24), ('admin', 25),
      ('admin', 26), ('admin', 27), ('admin', 28), ('admin', 29), ('admin', 30),
      ('admin', 31), ('admin', 32), ('admin', 33), ('admin', 34), ('admin', 35),
      ('admin', 36), ('admin', 37), ('admin', 38), ('admin', 39), ('admin', 40),
      ('hr', 1), ('hr', 2), ('hr', 3), ('hr', 4), ('hr', 5),
      ('hr', 6), ('hr', 7), ('hr', 8), ('hr', 9), ('hr', 10),
      ('hr', 11), ('hr', 12), ('hr', 13), ('hr', 14), ('hr', 15),
      ('hr', 16), ('hr', 17), ('hr', 18), ('hr', 19), ('hr', 20),
      ('hr', 21), ('hr', 22), ('hr', 23), ('hr', 24), ('hr', 25),
      ('hr', 26), ('hr', 27), ('hr', 28), ('hr', 29), ('hr', 30),
      ('hr', 31), ('hr', 32), ('hr', 33),
      ('employee', 1), ('employee', 26), ('employee', 38), ('employee', 39),
      ('candidate', 1), ('candidate', 17), ('candidate', 26), ('candidate', 38), ('candidate', 39)
    `);
        console.log('权限初始数据已导入');
    });
};
exports.initPermissionData = initPermissionData;
const migratePermissions = () => {
    index_1.db.get("SELECT id FROM permissions WHERE code = 'log:view'", (err, row) => {
        if (err) {
            console.error('检查log:view权限失败:', err.message);
            return;
        }
        if (row) {
            return;
        }
        index_1.db.run(`INSERT INTO permissions (code, name, module, sort_order) VALUES ('log:view', '操作日志查看', '操作日志', 140)`, function (insertErr) {
            if (insertErr) {
                console.error('添加log:view权限失败:', insertErr.message);
                return;
            }
            const newPermId = this.lastID;
            index_1.db.run(`INSERT INTO role_permissions (role, permission_id) VALUES ('admin', ?)`, [newPermId], (rpErr) => {
                if (rpErr) {
                    console.error('为admin添加log:view权限失败:', rpErr.message);
                    return;
                }
                console.log('操作日志权限已迁移');
            });
        });
    });
};
exports.migratePermissions = migratePermissions;
