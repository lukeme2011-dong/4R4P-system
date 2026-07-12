"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const index_1 = require("./database/index");
const seed_1 = require("./database/seed");
const auth_1 = __importDefault(require("./routes/auth"));
const positions_1 = __importDefault(require("./routes/positions"));
const evaluations_1 = __importDefault(require("./routes/evaluations"));
const performance_1 = __importDefault(require("./routes/performance"));
const knowledge_1 = __importDefault(require("./routes/knowledge"));
const succession_1 = __importDefault(require("./routes/succession"));
const departments_1 = __importDefault(require("./routes/departments"));
const assessment_1 = __importDefault(require("./routes/assessment"));
const permissions_1 = __importDefault(require("./routes/permissions"));
const operationLogs_1 = __importDefault(require("./routes/operationLogs"));
const operationLog_1 = require("./middleware/operationLog");
const paths_1 = require("./utils/paths");
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const uploadsDir = (0, paths_1.getUploadsDir)();
app.use('/uploads', express_1.default.static(uploadsDir));
app.use((req, res, next) => {
    const originalSend = res.json;
    res.json = function (body) {
        const statusCode = res.statusCode;
        if (req.originalUrl?.startsWith('/api/') && !req.originalUrl?.includes('/operation-logs')) {
            (0, operationLog_1.logOperation)(req, statusCode);
        }
        return originalSend.call(this, body);
    };
    next();
});
app.use('/api/auth', auth_1.default);
app.use('/api/positions', positions_1.default);
app.use('/api/evaluations', evaluations_1.default);
app.use('/api/performance', performance_1.default);
app.use('/api/knowledge', knowledge_1.default);
app.use('/api/succession', succession_1.default);
app.use('/api/departments', departments_1.default);
app.use('/api/assessment', assessment_1.default);
app.use('/api/permissions', permissions_1.default);
app.use('/api/operation-logs', operationLogs_1.default);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '4R4P人才管理系统运行正常' });
});
const frontendDist = (0, paths_1.getFrontendDistDir)();
if (fs_1.default.existsSync(frontendDist)) {
    app.use(express_1.default.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
const openBrowser = (url) => {
    const start = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start'
            : 'xdg-open';
    require('child_process').exec(start + ' ' + url);
};
const startServer = async () => {
    try {
        await (0, index_1.initDatabase)();
        (0, seed_1.seedData)();
        (0, seed_1.initPermissionData)();
        app.listen(PORT, () => {
            const url = `http://localhost:${PORT}`;
            console.log(`\n========================================`);
            console.log(`  4R4P 人才管理系统启动成功！`);
            console.log(`  访问地址: ${url}`);
            console.log(`  数据库位置: ${path_1.default.dirname(require('./utils/paths').getDatabasePath())}`);
            console.log(`========================================\n`);
            if (!process.env.NO_AUTO_OPEN) {
                setTimeout(() => {
                    openBrowser(url);
                }, 500);
            }
        });
    }
    catch (error) {
        console.error('服务器启动失败:', error);
    }
};
startServer();
process.on('exit', () => {
    index_1.db.close();
});
