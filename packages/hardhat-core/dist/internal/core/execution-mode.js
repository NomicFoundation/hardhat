"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRunningHardhatCoreTests = exports.isLocalDev = exports.isHardhatInstalledLocallyOrLinked = void 0;
const fs = __importStar(require("fs"));
const packageInfo_1 = require("../util/packageInfo");
/**
 * Returns true if Hardhat is installed locally or linked from its repository,
 * by looking for it using the node module resolution logic.
 *
 * If a config file is provided, we start looking for it from it. Otherwise,
 * we use the current working directory.
 */
function isHardhatInstalledLocallyOrLinked(configPath) {
    try {
        const resolvedPackageJson = require.resolve("hardhat/package.json", {
            paths: [configPath !== null && configPath !== void 0 ? configPath : process.cwd()],
        });
        const thisPackageJson = (0, packageInfo_1.getPackageJsonPath)();
        // We need to get the realpaths here, as hardhat may be linked and
        // running with `node --preserve-symlinks`
        return (fs.realpathSync(resolvedPackageJson) === fs.realpathSync(thisPackageJson));
    }
    catch (_a) {
        return false;
    }
}
exports.isHardhatInstalledLocallyOrLinked = isHardhatInstalledLocallyOrLinked;
/**
 * Checks whether we're using Hardhat in development mode (that is, we're working _on_ Hardhat).
 */
function isLocalDev() {
    // TODO: This may give a false positive under yarn PnP
    return isRunningHardhatCoreTests() || !__filename.includes("node_modules");
}
exports.isLocalDev = isLocalDev;
function isRunningHardhatCoreTests() {
    return __filename.endsWith(".ts");
}
exports.isRunningHardhatCoreTests = isRunningHardhatCoreTests;
//# sourceMappingURL=execution-mode.js.map