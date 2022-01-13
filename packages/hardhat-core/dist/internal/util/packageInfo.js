"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHardhatVersion = exports.getPackageJson = exports.findClosestPackageJson = exports.getPackageRoot = exports.getPackageJsonPath = void 0;
const find_up_1 = __importDefault(require("find-up"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function getPackageJsonPath() {
    return findClosestPackageJson(__filename);
}
exports.getPackageJsonPath = getPackageJsonPath;
function getPackageRoot() {
    const packageJsonPath = getPackageJsonPath();
    return path_1.default.dirname(packageJsonPath);
}
exports.getPackageRoot = getPackageRoot;
function findClosestPackageJson(file) {
    return find_up_1.default.sync("package.json", { cwd: path_1.default.dirname(file) });
}
exports.findClosestPackageJson = findClosestPackageJson;
async function getPackageJson() {
    const root = getPackageRoot();
    return fs_extra_1.default.readJSON(path_1.default.join(root, "package.json"));
}
exports.getPackageJson = getPackageJson;
function getHardhatVersion() {
    const packageJsonPath = findClosestPackageJson(__filename);
    if (packageJsonPath === null) {
        return null;
    }
    try {
        const packageJson = fs_extra_1.default.readJsonSync(packageJsonPath);
        return packageJson.version;
    }
    catch (_a) {
        return null;
    }
}
exports.getHardhatVersion = getHardhatVersion;
//# sourceMappingURL=packageInfo.js.map