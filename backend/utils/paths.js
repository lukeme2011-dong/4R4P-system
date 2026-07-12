"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFrontendDistDir = exports.getUploadsDir = exports.getDatabasePath = exports.BASE_DIR = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
function resolveBaseDir() {
    if (process.pkg) {
        return (0, path_1.dirname)(process.execPath);
    }
    if (typeof __dirname !== 'undefined') {
        return (0, path_1.join)(__dirname, '..', '..');
    }
    return process.cwd();
}
const baseDir = resolveBaseDir();
exports.BASE_DIR = baseDir;
const getDatabasePath = () => {
    const dbDir = (0, path_1.join)(baseDir, 'data');
    if (!(0, fs_1.existsSync)(dbDir)) {
        (0, fs_1.mkdirSync)(dbDir, { recursive: true });
    }
    return (0, path_1.join)(dbDir, '4r4p.db');
};
exports.getDatabasePath = getDatabasePath;
const getUploadsDir = () => {
    const uploadsDir = (0, path_1.join)(baseDir, 'uploads');
    if (!(0, fs_1.existsSync)(uploadsDir)) {
        (0, fs_1.mkdirSync)(uploadsDir, { recursive: true });
    }
    const avatarsDir = (0, path_1.join)(uploadsDir, 'avatars');
    if (!(0, fs_1.existsSync)(avatarsDir)) {
        (0, fs_1.mkdirSync)(avatarsDir, { recursive: true });
    }
    return uploadsDir;
};
exports.getUploadsDir = getUploadsDir;
const getFrontendDistDir = () => {
    if (process.pkg) {
        const exeFrontend = (0, path_1.join)(baseDir, 'frontend');
        if ((0, fs_1.existsSync)(exeFrontend)) {
            return exeFrontend;
        }
        const distFrontend = (0, path_1.join)(baseDir, 'resources', 'frontend');
        if ((0, fs_1.existsSync)(distFrontend)) {
            return distFrontend;
        }
        return (0, path_1.join)(baseDir, 'frontend');
    }
    return (0, path_1.join)(baseDir, '..', 'frontend', 'dist');
};
exports.getFrontendDistDir = getFrontendDistDir;
