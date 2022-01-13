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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerDownloader = exports.CompilerPlatform = void 0;
const chalk_1 = __importDefault(require("chalk"));
const debug_1 = __importDefault(require("debug"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const errors_1 = require("../../core/errors");
const errors_list_1 = require("../../core/errors-list");
var CompilerPlatform;
(function (CompilerPlatform) {
    CompilerPlatform["LINUX"] = "linux-amd64";
    CompilerPlatform["WINDOWS"] = "windows-amd64";
    CompilerPlatform["MACOS"] = "macosx-amd64";
    CompilerPlatform["WASM"] = "wasm";
})(CompilerPlatform = exports.CompilerPlatform || (exports.CompilerPlatform = {}));
const log = (0, debug_1.default)("hardhat:core:solidity:downloader");
const COMPILER_FILES_DIR_URL_SOLC = "https://binaries.soliditylang.org/";
async function downloadFile(url, destinationFile) {
    const { download } = await Promise.resolve().then(() => __importStar(require("../../util/download")));
    log(`Downloading from ${url} to ${destinationFile}`);
    await download(url, destinationFile);
}
class CompilerDownloader {
    constructor(_compilersDir, options = {}) {
        var _a, _b;
        this._compilersDir = _compilersDir;
        this._download = (_a = options.download) !== null && _a !== void 0 ? _a : downloadFile;
        this._forceSolcJs = (_b = options.forceSolcJs) !== null && _b !== void 0 ? _b : false;
    }
    async isCompilerDownloaded(version) {
        const compilerBuild = await this.getCompilerBuild(version);
        const downloadedFilePath = this._getDownloadedFilePath(compilerBuild);
        return this._fileExists(downloadedFilePath);
    }
    async verifyCompiler(compilerBuild, downloadedFilePath) {
        const ethereumjsUtil = await Promise.resolve().then(() => __importStar(require("ethereumjs-util")));
        const expectedKeccak256 = compilerBuild.keccak256;
        const compiler = await fs_extra_1.default.readFile(downloadedFilePath);
        const compilerKeccak256 = ethereumjsUtil.bufferToHex(ethereumjsUtil.keccak(compiler));
        if (expectedKeccak256 !== compilerKeccak256) {
            await fs_extra_1.default.unlink(downloadedFilePath);
            await fs_extra_1.default.unlink(this.getCompilersListPath(compilerBuild.platform));
            throw new errors_1.HardhatError(errors_list_1.ERRORS.SOLC.INVALID_DOWNLOAD, {
                remoteVersion: compilerBuild.version,
            });
        }
    }
    async getDownloadedCompilerPath(version) {
        const { default: AdmZip } = await Promise.resolve().then(() => __importStar(require("adm-zip")));
        try {
            const compilerBuild = await this.getCompilerBuild(version);
            let downloadedFilePath = this._getDownloadedFilePath(compilerBuild);
            if (!(await this._fileExists(downloadedFilePath))) {
                await this.downloadCompiler(compilerBuild, downloadedFilePath);
            }
            await this.verifyCompiler(compilerBuild, downloadedFilePath);
            if (compilerBuild.platform === CompilerPlatform.LINUX ||
                compilerBuild.platform === CompilerPlatform.MACOS) {
                fs_extra_1.default.chmodSync(downloadedFilePath, 0o755);
            }
            else if (compilerBuild.platform === CompilerPlatform.WINDOWS) {
                // some window builds are zipped, some are not
                if (downloadedFilePath.endsWith(".zip")) {
                    const zip = new AdmZip(downloadedFilePath);
                    zip.extractAllTo(path_1.default.join(this._compilersDir, compilerBuild.version));
                    downloadedFilePath = path_1.default.join(this._compilersDir, compilerBuild.version, "solc.exe");
                }
            }
            return {
                compilerPath: downloadedFilePath,
                platform: compilerBuild.platform,
            };
        }
        catch (e) {
            if (e instanceof Error) {
                if (errors_1.HardhatError.isHardhatError(e)) {
                    throw e;
                }
                console.warn(chalk_1.default.yellow(`There was an unexpected problem downloading the compiler: ${e.message}`));
            }
        }
    }
    async getCompilersList(platform, pendingRetries = 3) {
        if (!(await this.compilersListExists(platform))) {
            await this.downloadCompilersList(platform);
        }
        try {
            return await fs_extra_1.default.readJSON(this.getCompilersListPath(platform));
        }
        catch (error) {
            // if parsing throws a syntax error, redownload and parse once more
            if (!(error instanceof SyntaxError) || pendingRetries === 0) {
                // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
                throw error;
            }
            // remove the malformed list and retry
            await fs_extra_1.default.remove(this.getCompilersListPath(platform));
            return this.getCompilersList(platform, pendingRetries - 1);
        }
    }
    async getCompilerBuild(version) {
        const platform = this._getCurrentPlarform();
        if (await this._versionExists(version, platform)) {
            try {
                return await this._getCompilerBuildByPlatform(version, platform);
            }
            catch (_a) {
                log("Couldn't download native compiler, using solcjs instead");
            }
        }
        return this._getCompilerBuildByPlatform(version, CompilerPlatform.WASM);
    }
    async downloadCompilersList(platform) {
        try {
            await this._download(getCompilerListURL(platform), this.getCompilersListPath(platform));
        }
        catch (error) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.SOLC.VERSION_LIST_DOWNLOAD_FAILED, {}, error);
        }
    }
    async downloadCompiler(compilerBuild, downloadedFilePath) {
        log(`Downloading compiler version ${compilerBuild.version} platform ${compilerBuild.platform}`);
        const compilerUrl = getCompilerURL(compilerBuild.platform, compilerBuild.path);
        try {
            await this._download(compilerUrl, downloadedFilePath);
        }
        catch (error) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.SOLC.DOWNLOAD_FAILED, {
                remoteVersion: compilerBuild.version,
            }, error);
        }
    }
    async compilersListExists(platform) {
        return fs_extra_1.default.pathExists(this.getCompilersListPath(platform));
    }
    getCompilersListPath(platform) {
        return path_1.default.join(this._compilersDir, platform, "list.json");
    }
    _getDownloadedFilePath(compilerBuild) {
        return path_1.default.join(this._compilersDir, compilerBuild.platform, compilerBuild.path);
    }
    async _fetchVersionPath(version, platform) {
        const compilersListExisted = await this.compilersListExists(platform);
        let list = await this.getCompilersList(platform);
        let compilerBuildPath = list.releases[version];
        // We may need to re-download the compilers list.
        if (compilerBuildPath === undefined && compilersListExisted) {
            await fs_extra_1.default.unlink(this.getCompilersListPath(platform));
            list = await this.getCompilersList(platform);
            compilerBuildPath = list.releases[version];
        }
        return compilerBuildPath;
    }
    async _versionExists(version, platform) {
        const versionPath = await this._fetchVersionPath(version, platform);
        return versionPath !== undefined;
    }
    async _getCompilerBuildByPlatform(version, platform) {
        const compilerBuildPath = await this._fetchVersionPath(version, platform);
        const list = await this.getCompilersList(platform);
        const compilerBuild = list.builds.find((b) => b.path === compilerBuildPath);
        if (compilerBuild === undefined) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.SOLC.INVALID_VERSION, { version });
        }
        compilerBuild.platform = platform;
        return compilerBuild;
    }
    async _fileExists(filePath) {
        return fs_extra_1.default.pathExists(filePath);
    }
    _getCurrentPlarform() {
        if (this._forceSolcJs) {
            return CompilerPlatform.WASM;
        }
        switch (os_1.default.platform()) {
            case "win32":
                return CompilerPlatform.WINDOWS;
            case "linux":
                return CompilerPlatform.LINUX;
            case "darwin":
                return CompilerPlatform.MACOS;
            default:
                return CompilerPlatform.WASM;
        }
    }
}
exports.CompilerDownloader = CompilerDownloader;
function getCompilerURL(platform, filePath) {
    return `${COMPILER_FILES_DIR_URL_SOLC}${platform}/${filePath}`;
}
function getCompilerListURL(platform) {
    return getCompilerURL(platform, "list.json");
}
//# sourceMappingURL=downloader.js.map