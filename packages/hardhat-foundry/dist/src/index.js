"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const task_names_1 = require("hardhat/builtin-tasks/task-names");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const foundry_1 = require("./foundry");
const TASK_INIT_FOUNDRY = "init-foundry";
let pluginActivated = false;
(0, config_1.extendConfig)((config, userConfig) => {
    // Check foundry.toml presence. Don't warn when running foundry initialization task
    if (!(0, fs_1.existsSync)(path_1.default.join(config.paths.root, "foundry.toml"))) {
        if (!process.argv.includes(TASK_INIT_FOUNDRY)) {
            console.log(chalk_1.default.yellow(`Warning: You are using the hardhat-foundry plugin but there isn't a foundry.toml file in your project. Run 'npx hardhat ${TASK_INIT_FOUNDRY}' to create one.`));
        }
        return;
    }
    // Load foundry config
    const foundryConfig = (0, foundry_1.getForgeConfig)();
    // Ensure required keys exist
    if (foundryConfig?.src === undefined ||
        foundryConfig?.cache_path === undefined) {
        throw new foundry_1.HardhatFoundryError("Couldn't find `src` or `cache_path` config keys after running `forge config --json`");
    }
    // Ensure foundry src path doesnt mismatch user-configured path
    const userSourcesPath = userConfig.paths?.sources;
    const foundrySourcesPath = foundryConfig.src;
    if (userSourcesPath !== undefined && userSourcesPath !== foundrySourcesPath) {
        throw new foundry_1.HardhatFoundryError(`User-configured sources path (${userSourcesPath}) doesn't match path configured in foundry (${foundrySourcesPath})`);
    }
    // Set sources path
    config.paths.sources = foundrySourcesPath;
    // Change hardhat's cache path if it clashes with foundry's
    const foundryCachePath = path_1.default.resolve(config.paths.root, foundryConfig.cache_path);
    if (config.paths.cache === foundryCachePath) {
        config.paths.cache = "cache_hardhat";
    }
    pluginActivated = true;
});
// Task that transforms import names to sourcenames using remappings
(0, config_1.internalTask)(task_names_1.TASK_COMPILE_TRANSFORM_IMPORT_NAME).setAction(async ({ importName }, _hre, runSuper) => {
    if (!pluginActivated) {
        return runSuper({ importName });
    }
    const remappings = await (0, foundry_1.getRemappings)();
    for (const [from, to] of Object.entries(remappings)) {
        if (importName.startsWith(from) && !importName.startsWith(".")) {
            return importName.replace(from, to);
        }
    }
    return importName;
});
// Task that includes the remappings in solc input
(0, config_1.internalTask)(task_names_1.TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE).setAction(async ({ dependencyGraph, file, }, hre, runSuper) => {
    const job = (await runSuper({ dependencyGraph, file }));
    if (!pluginActivated || isCompilationJobCreationError(job)) {
        return job;
    }
    const remappings = await (0, foundry_1.getRemappings)();
    job.getSolcConfig().settings.remappings = Object.entries(remappings).map(([from, to]) => `${from}=${to}`);
    return job;
});
(0, config_1.task)(TASK_INIT_FOUNDRY, "Initialize foundry setup in current hardhat project", async (_, hre) => {
    const foundryConfigPath = path_1.default.resolve(hre.config.paths.root, "foundry.toml");
    if ((0, fs_1.existsSync)(foundryConfigPath)) {
        console.warn(chalk_1.default.yellow(`File foundry.toml already exists. Aborting.`));
        process.exit(1);
    }
    console.log(`Creating foundry.toml file...`);
    (0, fs_1.writeFileSync)(foundryConfigPath, [
        `[profile.default]`,
        `src = '${path_1.default.relative(hre.config.paths.root, hre.config.paths.sources)}'`,
        `out = 'out'`,
        `libs = ['node_modules', 'lib']`,
        `test = '${path_1.default.relative(hre.config.paths.root, hre.config.paths.tests)}'`,
        `cache_path  = 'cache_forge'`,
    ].join("\n"));
    await (0, foundry_1.installDependency)("foundry-rs/forge-std");
});
function isCompilationJobCreationError(x) {
    return "reason" in x;
}
//# sourceMappingURL=index.js.map