"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = require("path");
const fs_1 = require("fs");
const dotenv_1 = require("dotenv");
const paths_1 = require("../utils/paths");
(0, dotenv_1.config)();
const dbPath = (0, paths_1.getDatabasePath)();
try {
    (0, fs_1.mkdirSync)((0, path_1.dirname)(dbPath), { recursive: true });
}
catch (e) {
}
exports.db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    }
    else {
        console.log('数据库连接成功');
    }
});
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        real_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        department TEXT,
        position TEXT,
        email TEXT,
        phone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        parent_id INTEGER DEFAULT 0,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department_id INTEGER,
        level TEXT NOT NULL,
        r1_weight INTEGER DEFAULT 25,
        r2_weight INTEGER DEFAULT 25,
        r3_weight INTEGER DEFAULT 25,
        r4_weight INTEGER DEFAULT 25,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )`,
            `CREATE TABLE IF NOT EXISTS position_behavior (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER,
        r_type TEXT NOT NULL,
        behavior TEXT NOT NULL,
        score_criteria TEXT,
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS position_combinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER,
        combination TEXT NOT NULL,
        type TEXT NOT NULL,
        expected_value TEXT,
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        resume TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS recruit_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER,
        position_id INTEGER,
        r1_score INTEGER DEFAULT 0,
        r2_score INTEGER DEFAULT 0,
        r3_score INTEGER DEFAULT 0,
        r4_score INTEGER DEFAULT 0,
        primary_combination TEXT,
        secondary_combination TEXT,
        matching_score INTEGER DEFAULT 0,
        report TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id),
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS personality_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        assessment_code TEXT UNIQUE,
        r1_score INTEGER DEFAULT 0,
        r2_score INTEGER DEFAULT 0,
        r3_score INTEGER DEFAULT 0,
        r4_score INTEGER DEFAULT 0,
        personality_type TEXT,
        position_name TEXT,
        matching_score INTEGER DEFAULT 0,
        interview_date TEXT,
        interview_round TEXT,
        interviewer_name TEXT,
        status TEXT DEFAULT 'submitted',
        has_veto INTEGER DEFAULT 0,
        talent_level TEXT,
        hire_suggestion TEXT,
        strengths TEXT,
        weaknesses TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
            `CREATE TABLE IF NOT EXISTS personality_test_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        r_type TEXT NOT NULL,
        question TEXT,
        score INTEGER,
        is_veto INTEGER DEFAULT 0,
        star_situation TEXT,
        star_task TEXT,
        star_action TEXT,
        star_result TEXT,
        FOREIGN KEY (test_id) REFERENCES personality_tests(id)
      )`,
            `CREATE TABLE IF NOT EXISTS performance_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        position_id INTEGER,
        period TEXT NOT NULL,
        r1_score INTEGER DEFAULT 0,
        r2_score INTEGER DEFAULT 0,
        r3_score INTEGER DEFAULT 0,
        r4_score INTEGER DEFAULT 0,
        overall_score INTEGER DEFAULT 0,
        manager_comment TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        r_type TEXT NOT NULL,
        score INTEGER NOT NULL,
        category TEXT DEFAULT 'standard'
      )`,
            `CREATE TABLE IF NOT EXISTS interview_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        r_type TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT,
        category TEXT DEFAULT 'standard'
      )`,
            `CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS succession_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER,
        user_id INTEGER,
        status TEXT DEFAULT 'active',
        priority INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
            `CREATE TABLE IF NOT EXISTS pdca_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        period TEXT NOT NULL,
        plan TEXT,
        do_record TEXT,
        check_result TEXT,
        act_plan TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
            `CREATE TABLE IF NOT EXISTS evaluation_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        r_type TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT,
        score INTEGER DEFAULT 10,
        category TEXT DEFAULT 'standard',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_veto INTEGER DEFAULT 0
      )`,
            `CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_code TEXT UNIQUE NOT NULL,
        candidate_name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        interview_date TEXT,
        interview_round TEXT,
        interviewer_name TEXT,
        r1_score REAL DEFAULT 0,
        r2_score REAL DEFAULT 0,
        r3_score REAL DEFAULT 0,
        r4_score REAL DEFAULT 0,
        r1_weighted REAL DEFAULT 0,
        r2_weighted REAL DEFAULT 0,
        r3_weighted REAL DEFAULT 0,
        r4_weighted REAL DEFAULT 0,
        total_score REAL DEFAULT 0,
        talent_level TEXT,
        hire_suggestion TEXT,
        has_veto INTEGER DEFAULT 0,
        strengths TEXT,
        weaknesses TEXT,
        status TEXT DEFAULT 'draft',
        submitted_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS assessment_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        r_type TEXT NOT NULL,
        score INTEGER,
        is_veto INTEGER DEFAULT 0,
        star_situation TEXT,
        star_task TEXT,
        star_action TEXT,
        star_result TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id),
        FOREIGN KEY (question_id) REFERENCES evaluation_questions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS position_weight_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_name TEXT UNIQUE NOT NULL,
        r1_weight INTEGER DEFAULT 25,
        r2_weight INTEGER DEFAULT 25,
        r3_weight INTEGER DEFAULT 25,
        r4_weight INTEGER DEFAULT 25,
        is_preset INTEGER DEFAULT 0,
        category TEXT,
        description TEXT,
        match_threshold INTEGER DEFAULT 12,
        veto_dimension TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS assessment_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        draft_data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id)
      )`,
            `CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        module TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        permission_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS position_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id),
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        permission_type TEXT DEFAULT 'allow',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
      )`,
            `CREATE TABLE IF NOT EXISTS operation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        real_name TEXT,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        method TEXT,
        url TEXT,
        ip TEXT,
        user_agent TEXT,
        request_params TEXT,
        response_status INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS test_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_questions INTEGER DEFAULT 20,
        r1_count INTEGER DEFAULT 5,
        r2_count INTEGER DEFAULT 5,
        r3_count INTEGER DEFAULT 5,
        r4_count INTEGER DEFAULT 5,
        use_weight_distribution INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
        ];
        let completed = 0;
        let hasError = false;
        tables.forEach(sql => {
            exports.db.run(sql, (err) => {
                if (hasError)
                    return;
                if (err) {
                    hasError = true;
                    console.error('创建表失败:', err.message);
                    reject(err);
                    return;
                }
                completed++;
                if (completed === tables.length) {
                    console.log('所有数据表创建完成');
                    // 自动迁移：为 position_weight_configs 添加新字段
                    const migrations = [
                        'ALTER TABLE position_weight_configs ADD COLUMN category TEXT',
                        'ALTER TABLE position_weight_configs ADD COLUMN description TEXT',
                        'ALTER TABLE position_weight_configs ADD COLUMN match_threshold INTEGER DEFAULT 12',
                        'ALTER TABLE position_weight_configs ADD COLUMN veto_dimension TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN position_name TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN matching_score INTEGER DEFAULT 0',
                        'ALTER TABLE personality_tests ADD COLUMN assessment_code TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN interview_date TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN interview_round TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN interviewer_name TEXT',
                        "ALTER TABLE personality_tests ADD COLUMN status TEXT DEFAULT 'submitted'",
                        'ALTER TABLE personality_tests ADD COLUMN has_veto INTEGER DEFAULT 0',
                        'ALTER TABLE personality_tests ADD COLUMN talent_level TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN hire_suggestion TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN strengths TEXT',
                        'ALTER TABLE personality_tests ADD COLUMN weaknesses TEXT',
                        'ALTER TABLE users ADD COLUMN gender TEXT',
                        'ALTER TABLE users ADD COLUMN education TEXT',
                        'ALTER TABLE users ADD COLUMN ethnicity TEXT',
                        'ALTER TABLE users ADD COLUMN political_status TEXT',
                        'ALTER TABLE users ADD COLUMN id_card TEXT',
                        'ALTER TABLE users ADD COLUMN birth_year INTEGER',
                        'ALTER TABLE users ADD COLUMN birth_month INTEGER',
                        'ALTER TABLE users ADD COLUMN birth_day INTEGER',
                        'ALTER TABLE users ADD COLUMN id_province TEXT',
                        'ALTER TABLE users ADD COLUMN id_city TEXT',
                        'ALTER TABLE users ADD COLUMN address TEXT',
                        'ALTER TABLE users ADD COLUMN bio TEXT',
                        'ALTER TABLE users ADD COLUMN avatar TEXT',
                        // 候选人角色补充权限
                        "INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES ('candidate', (SELECT id FROM permissions WHERE code = 'assessment:view'))",
                        "INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES ('candidate', (SELECT id FROM permissions WHERE code = 'profile:view'))",
                        "INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES ('candidate', (SELECT id FROM permissions WHERE code = 'dashboard:view'))"
                    ];
                    let migCompleted = 0;
                    migrations.forEach(migSql => {
                        exports.db.run(migSql, () => {
                            migCompleted++;
                            if (migCompleted === migrations.length) {
                                console.log('数据库迁移完成');
                                // 初始化默认数据
                                initDefaultData();
                                resolve();
                            }
                        });
                    });
                }
            });
        });
    });
};
exports.initDatabase = initDatabase;
function initDefaultData() {
    exports.db.get('SELECT id FROM test_settings WHERE id = 1', (err, row) => {
        if (!row) {
            exports.db.run('INSERT INTO test_settings (id, total_questions, r1_count, r2_count, r3_count, r4_count, use_weight_distribution) VALUES (1, 20, 5, 5, 5, 5, 1)', (err) => {
                if (err) {
                    console.error('初始化 test_settings 失败:', err.message);
                }
                else {
                    console.log('初始化 test_settings 默认数据完成');
                }
            });
        }
    });
}
