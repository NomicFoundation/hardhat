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
exports.replaceBackslashes = exports.isAbsolutePathSourceName = exports.normalizeSourceName = exports.localSourceNameToPath = exports.localPathToSourceName = exports.validateSourceNameExistenceAndCasing = exports.isLocalSourceName = exports.validateSourceNameFormat = void 0;
const path_1 = __importDefault(require("path"));
const errors_1 = require("../internal/core/errors");
const errors_list_1 = require("../internal/core/errors-list");
const NODE_MODULES = "node_modules";
/**
 * This function validates the source name's format.
 *
 * It throws if the format is invalid.
 * If it doesn't throw all you know is that the format is valid.
 */
function validateSourceNameFormat(sourceName) {
    if (isAbsolutePathSourceName(sourceName)) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_ABSOLUTE_PATH, {
            name: sourceName,
        });
    }
    if (isExplicitRelativePath(sourceName)) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_RELATIVE_PATH, {
            name: sourceName,
        });
    }
    // We check this before normalizing so we are sure that the difference
    // comes from slash vs backslash
    if (replaceBackslashes(sourceName) !== sourceName) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.INVALID_SOURCE_NAME_BACKSLASHES, {
            name: sourceName,
        });
    }
    if (normalizeSourceName(sourceName) !== sourceName) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.INVALID_SOURCE_NOT_NORMALIZED, {
            name: sourceName,
        });
    }
}
exports.validateSourceNameFormat = validateSourceNameFormat;
/**
 * This function returns true if the sourceName is, potentially, from a local
 * file. It doesn't validate that the file actually exists.
 *
 * The source name must be in a valid format.
 */
async function isLocalSourceName(projectRoot, sourceName) {
    // Note that we consider "hardhat/console.sol" as a special case here.
    // This lets someone have a "hardhat" directory within their project without
    // it impacting their use of `console.log`.
    // See issue https://github.com/nomiclabs/hardhat/issues/998
    if (sourceName.includes(NODE_MODULES) ||
        sourceName === "hardhat/console.sol") {
        return false;
    }
    const slashIndex = sourceName.indexOf("/");
    const firstDirOrFileName = slashIndex !== -1 ? sourceName.substring(0, slashIndex) : sourceName;
    try {
        await getPathTrueCase(projectRoot, firstDirOrFileName);
    }
    catch (error) {
        if (errors_1.HardhatError.isHardhatErrorType(error, errors_list_1.ERRORS.SOURCE_NAMES.FILE_NOT_FOUND)) {
            return false;
        }
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw error;
    }
    return true;
}
exports.isLocalSourceName = isLocalSourceName;
/**
 * Validates that a source name exists, starting from `fromDir`, and has the
 * right casing.
 *
 * The source name must be in a valid format.
 */
async function validateSourceNameExistenceAndCasing(fromDir, sourceName) {
    const trueCaseSourceName = await getPathTrueCase(fromDir, sourceName);
    if (trueCaseSourceName !== sourceName) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.WRONG_CASING, {
            incorrect: sourceName,
            correct: trueCaseSourceName,
        });
    }
}
exports.validateSourceNameExistenceAndCasing = validateSourceNameExistenceAndCasing;
/**
 * Returns the source name of an existing local file's absolute path.
 *
 * Throws is the file doesn't exist, it's not inside the project, or belongs
 * to a library.
 */
async function localPathToSourceName(projectRoot, localFileAbsolutePath) {
    const relativePath = path_1.default.relative(projectRoot, localFileAbsolutePath);
    const normalized = normalizeSourceName(relativePath);
    if (normalized.startsWith("..")) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.EXTERNAL_AS_LOCAL, {
            path: localFileAbsolutePath,
        });
    }
    if (normalized.includes(NODE_MODULES)) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.NODE_MODULES_AS_LOCAL, {
            path: localFileAbsolutePath,
        });
    }
    return getPathTrueCase(projectRoot, relativePath);
}
exports.localPathToSourceName = localPathToSourceName;
/**
 * This function takes a valid local source name and returns its path. The
 * source name doesn't need to point to an existing file.
 */
function localSourceNameToPath(projectRoot, sourceName) {
    return path_1.default.join(projectRoot, sourceName);
}
exports.localSourceNameToPath = localSourceNameToPath;
/**
 * Normalizes the source name, for example, by replacing `a/./b` with `a/b`.
 *
 * The sourceName param doesn't have to be a valid source name. It can,
 * for example, be denormalized.
 */
function normalizeSourceName(sourceName) {
    return replaceBackslashes(path_1.default.normalize(sourceName));
}
exports.normalizeSourceName = normalizeSourceName;
/**
 * This function returns true if the sourceName is a unix absolute path or a
 * platform-dependent one.
 *
 * This function is used instead of just `path.isAbsolute` to ensure that
 * source names never start with `/`, even on Windows.
 */
function isAbsolutePathSourceName(sourceName) {
    return path_1.default.isAbsolute(sourceName) || sourceName.startsWith("/");
}
exports.isAbsolutePathSourceName = isAbsolutePathSourceName;
/**
 * This function returns true if the sourceName is a unix path that is based on
 * the current directory `./`.
 */
function isExplicitRelativePath(sourceName) {
    const [base] = sourceName.split("/", 1);
    return base === "." || base === "..";
}
/**
 * This function replaces backslashes (\\) with slashes (/).
 *
 * Note that a source name must not contain backslashes.
 */
function replaceBackslashes(str) {
    const slash = require("slash");
    return slash(str);
}
exports.replaceBackslashes = replaceBackslashes;
/**
 * Returns the true casing of `p` as a relative path from `fromDir`. Throws if
 * `p` doesn't exist. `p` MUST be in source name format.
 */
async function getPathTrueCase(fromDir, p) {
    const { trueCasePath } = await Promise.resolve().then(() => __importStar(require("true-case-path")));
    try {
        const tcp = await trueCasePath(p, fromDir);
        return normalizeSourceName(path_1.default.relative(fromDir, tcp));
    }
    catch (error) {
        if (error instanceof Error) {
            if (typeof error.message === "string" &&
                error.message.includes("no matching file exists")) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.SOURCE_NAMES.FILE_NOT_FOUND, {
                    name: p,
                }, error);
            }
        }
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw error;
    }
}
//# sourceMappingURL=source-names.js.map