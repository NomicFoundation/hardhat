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
const fs = __importStar(require("fs"));
const config_env_1 = require("../internal/core/config/config-env");
const errors_1 = require("../internal/core/errors");
const errors_list_1 = require("../internal/core/errors-list");
const packageInfo_1 = require("../internal/util/packageInfo");
const task_names_1 = require("./task-names");
function getSortedFiles(dependenciesGraph) {
    const tsort = require("tsort");
    const graph = tsort();
    const filesMap = {};
    const resolvedFiles = dependenciesGraph.getResolvedFiles();
    resolvedFiles.forEach((f) => (filesMap[f.sourceName] = f));
    for (const [from, deps] of dependenciesGraph.entries()) {
        for (const to of deps) {
            graph.add(to.sourceName, from.sourceName);
        }
    }
    try {
        const topologicalSortedNames = graph.sort();
        // If an entry has no dependency it won't be included in the graph, so we
        // add them and then dedup the array
        const withEntries = topologicalSortedNames.concat(resolvedFiles.map((f) => f.sourceName));
        const sortedNames = [...new Set(withEntries)];
        return sortedNames.map((n) => filesMap[n]);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.toString().includes("Error: There is a cycle in the graph.")) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.BUILTIN_TASKS.FLATTEN_CYCLE, error);
            }
        }
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw error;
    }
}
function getFileWithoutImports(resolvedFile) {
    const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm;
    return resolvedFile.content.rawContent
        .replace(IMPORT_SOLIDITY_REGEX, "")
        .trim();
}
(0, config_env_1.subtask)(task_names_1.TASK_FLATTEN_GET_FLATTENED_SOURCE, "Returns all contracts and their dependencies flattened")
    .addOptionalParam("files", undefined, undefined, config_env_1.types.any)
    .setAction(async ({ files }, { run }) => {
    const dependencyGraph = await run(task_names_1.TASK_FLATTEN_GET_DEPENDENCY_GRAPH, { files });
    let flattened = "";
    if (dependencyGraph.getResolvedFiles().length === 0) {
        return flattened;
    }
    const packageJson = await (0, packageInfo_1.getPackageJson)();
    flattened += `// Sources flattened with hardhat v${packageJson.version} https://hardhat.org`;
    const sortedFiles = getSortedFiles(dependencyGraph);
    for (const file of sortedFiles) {
        flattened += `\n\n// File ${file.getVersionedName()}\n`;
        flattened += `\n${getFileWithoutImports(file)}\n`;
    }
    return flattened.trim();
});
(0, config_env_1.subtask)(task_names_1.TASK_FLATTEN_GET_DEPENDENCY_GRAPH)
    .addOptionalParam("files", undefined, undefined, config_env_1.types.any)
    .setAction(async ({ files }, { run }) => {
    const sourcePaths = files === undefined
        ? await run(task_names_1.TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS)
        : files.map((f) => fs.realpathSync(f));
    const sourceNames = await run(task_names_1.TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES, {
        sourcePaths,
    });
    const dependencyGraph = await run(task_names_1.TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH, { sourceNames });
    return dependencyGraph;
});
(0, config_env_1.task)(task_names_1.TASK_FLATTEN, "Flattens and prints contracts and their dependencies")
    .addOptionalVariadicPositionalParam("files", "The files to flatten", undefined, config_env_1.types.inputFile)
    .setAction(async ({ files }, { run }) => {
    console.log(await run(task_names_1.TASK_FLATTEN_GET_FLATTENED_SOURCE, { files }));
});
//# sourceMappingURL=flatten.js.map