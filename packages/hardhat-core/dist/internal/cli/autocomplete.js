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
exports.complete = exports.REQUIRED_HH_VERSION_RANGE = exports.HARDHAT_COMPLETE_FILES = void 0;
const find_up_1 = __importDefault(require("find-up"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const hardhat_params_1 = require("../core/params/hardhat-params");
const global_dir_1 = require("../util/global-dir");
const hash_1 = require("../util/hash");
const lang_1 = require("../util/lang");
const ArgumentsParser_1 = require("./ArgumentsParser");
exports.HARDHAT_COMPLETE_FILES = "__hardhat_complete_files__";
exports.REQUIRED_HH_VERSION_RANGE = "^1.0.0";
async function complete({ line, point, }) {
    var _a, _b;
    const completionData = await getCompletionData();
    if (completionData === undefined) {
        return [];
    }
    const { networks, tasks } = completionData;
    const words = line.split(/\s+/).filter((x) => x.length > 0);
    const wordsBeforeCursor = line.slice(0, point).split(/\s+/);
    // examples:
    // `hh compile --network|` => prev: "compile" last: "--network"
    // `hh compile --network |` => prev: "--network" last: ""
    // `hh compile --network ha|` => prev: "--network" last: "ha"
    const [prev, last] = wordsBeforeCursor.slice(-2);
    const startsWithLast = (completion) => completion.startsWith(last);
    const coreParams = Object.values(hardhat_params_1.HARDHAT_PARAM_DEFINITIONS)
        .map((param) => {
        var _a;
        return ({
            name: ArgumentsParser_1.ArgumentsParser.paramNameToCLA(param.name),
            description: (_a = param.description) !== null && _a !== void 0 ? _a : "",
        });
    })
        .filter((x) => !words.includes(x.name));
    // check if the user entered a task
    let task;
    let index = 1;
    while (index < words.length) {
        if (isGlobalFlag(words[index])) {
            index += 1;
        }
        else if (isGlobalParam(words[index])) {
            index += 2;
        }
        else if (words[index].startsWith("--")) {
            index += 1;
        }
        else {
            task = words[index];
            break;
        }
    }
    // if a task was found but it's equal to the last word, it means
    // that the cursor is after the task, we ignore the task in this
    // case because if you have a task `foo` and `foobar` and the
    // line is: `hh foo|`, we want tasks to be suggested
    if (task === last) {
        task = undefined;
    }
    if (prev === "--network") {
        return networks.filter(startsWithLast).map((network) => ({
            name: network,
            description: "",
        }));
    }
    // if the previous word is a param, then a value is expected
    // we don't complete anything here
    if (prev.startsWith("-")) {
        const paramName = ArgumentsParser_1.ArgumentsParser.cLAToParamName(prev);
        const globalParam = hardhat_params_1.HARDHAT_PARAM_DEFINITIONS[paramName];
        if (globalParam !== undefined && !globalParam.isFlag) {
            return exports.HARDHAT_COMPLETE_FILES;
        }
        const isTaskParam = task !== undefined &&
            ((_b = (_a = tasks[task]) === null || _a === void 0 ? void 0 : _a.paramDefinitions[paramName]) === null || _b === void 0 ? void 0 : _b.isFlag) === false;
        if (isTaskParam) {
            return exports.HARDHAT_COMPLETE_FILES;
        }
    }
    // if there's no task, we complete either tasks or params
    if (task === undefined || tasks[task] === undefined) {
        const taskSuggestions = Object.values(tasks)
            .filter((x) => !x.isSubtask)
            .map((x) => ({
            name: x.name,
            description: x.description,
        }));
        if (last.startsWith("-")) {
            return coreParams.filter((param) => startsWithLast(param.name));
        }
        return taskSuggestions.filter((x) => startsWithLast(x.name));
    }
    if (!last.startsWith("-")) {
        return exports.HARDHAT_COMPLETE_FILES;
    }
    // if there's a task and the last word starts with -, we complete its params and the global params
    const taskParams = Object.values(tasks[task].paramDefinitions)
        .map((param) => ({
        name: ArgumentsParser_1.ArgumentsParser.paramNameToCLA(param.name),
        description: param.description,
    }))
        .filter((x) => !words.includes(x.name));
    return [...taskParams, ...coreParams].filter((suggestion) => startsWithLast(suggestion.name));
}
exports.complete = complete;
async function getCompletionData() {
    const projectId = getProjectId();
    if (projectId === undefined) {
        return undefined;
    }
    const cachedCompletionData = await getCachedCompletionData(projectId);
    if (cachedCompletionData !== undefined) {
        if (arePreviousMtimesCorrect(cachedCompletionData.mtimes)) {
            return cachedCompletionData.completionData;
        }
    }
    const filesBeforeRequire = Object.keys(require.cache);
    let hre;
    try {
        process.env.TS_NODE_TRANSPILE_ONLY = "1";
        require("../../register");
        hre = global.hre;
    }
    catch (_a) {
        return undefined;
    }
    const filesAfterRequire = Object.keys(require.cache);
    const mtimes = getMtimes(filesBeforeRequire, filesAfterRequire);
    const networks = Object.keys(hre.config.networks);
    // we extract the tasks data explicitly to make sure everything
    // is serializable and to avoid saving unnecessary things from the HRE
    const tasks = (0, lang_1.mapValues)(hre.tasks, (task) => {
        var _a;
        return ({
            name: task.name,
            description: (_a = task.description) !== null && _a !== void 0 ? _a : "",
            isSubtask: task.isSubtask,
            paramDefinitions: (0, lang_1.mapValues)(task.paramDefinitions, (paramDefinition) => {
                var _a;
                return ({
                    name: paramDefinition.name,
                    description: (_a = paramDefinition.description) !== null && _a !== void 0 ? _a : "",
                    isFlag: paramDefinition.isFlag,
                });
            }),
        });
    });
    const completionData = {
        networks,
        tasks,
    };
    await saveCachedCompletionData(projectId, completionData, mtimes);
    return completionData;
}
function getProjectId() {
    const packageJsonPath = find_up_1.default.sync("package.json");
    if (packageJsonPath === null) {
        return undefined;
    }
    return (0, hash_1.createNonCryptographicHashBasedIdentifier)(Buffer.from(packageJsonPath)).toString("hex");
}
function arePreviousMtimesCorrect(mtimes) {
    try {
        return Object.entries(mtimes).every(([file, mtime]) => fs.statSync(file).mtime.valueOf() === mtime);
    }
    catch (_a) {
        return false;
    }
}
function getMtimes(filesLoadedBefore, filesLoadedAfter) {
    const loadedByHardhat = filesLoadedAfter.filter((f) => !filesLoadedBefore.includes(f));
    const stats = loadedByHardhat.map((f) => fs.statSync(f));
    const mtimes = loadedByHardhat.map((f, i) => ({
        [f]: stats[i].mtime.valueOf(),
    }));
    if (mtimes.length === 0) {
        return {};
    }
    return Object.assign(mtimes[0], ...mtimes.slice(1));
}
async function getCachedCompletionData(projectId) {
    const cachedCompletionDataPath = await getCachedCompletionDataPath(projectId);
    if (fs.existsSync(cachedCompletionDataPath)) {
        try {
            const cachedCompletionData = fs.readJsonSync(cachedCompletionDataPath);
            return cachedCompletionData;
        }
        catch (_a) {
            // remove the file if it seems invalid
            fs.unlinkSync(cachedCompletionDataPath);
            return undefined;
        }
    }
}
async function saveCachedCompletionData(projectId, completionData, mtimes) {
    const cachedCompletionDataPath = await getCachedCompletionDataPath(projectId);
    await fs.outputJson(cachedCompletionDataPath, { completionData, mtimes });
}
async function getCachedCompletionDataPath(projectId) {
    const cacheDir = await (0, global_dir_1.getCacheDir)();
    return path.join(cacheDir, "autocomplete", `${projectId}.json`);
}
function isGlobalFlag(param) {
    var _a;
    const paramName = ArgumentsParser_1.ArgumentsParser.cLAToParamName(param);
    return ((_a = hardhat_params_1.HARDHAT_PARAM_DEFINITIONS[paramName]) === null || _a === void 0 ? void 0 : _a.isFlag) === true;
}
function isGlobalParam(param) {
    var _a;
    const paramName = ArgumentsParser_1.ArgumentsParser.cLAToParamName(param);
    return ((_a = hardhat_params_1.HARDHAT_PARAM_DEFINITIONS[paramName]) === null || _a === void 0 ? void 0 : _a.isFlag) === false;
}
//# sourceMappingURL=autocomplete.js.map