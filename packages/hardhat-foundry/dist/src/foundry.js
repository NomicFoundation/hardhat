"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDependency = exports.getRemappings = exports.getForgeConfig = exports.HardhatFoundryError = void 0;
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const errors_1 = require("hardhat/internal/core/errors");
const util_1 = require("util");
const exec = (0, util_1.promisify)(child_process_1.exec);
let cachedRemappings;
class HardhatFoundryError extends errors_1.NomicLabsHardhatPluginError {
    constructor(message, parent) {
        super("hardhat-foundry", message, parent);
    }
}
exports.HardhatFoundryError = HardhatFoundryError;
class ForgeInstallError extends HardhatFoundryError {
    constructor(dependency, parent) {
        super(`Couldn't install '${dependency}', please install it manually.

${parent.message}
`, parent);
    }
}
function getForgeConfig() {
    return JSON.parse(runCmdSync("forge config --json"));
}
exports.getForgeConfig = getForgeConfig;
async function getRemappings() {
    // Return remappings if they were already loaded
    if (cachedRemappings !== undefined) {
        return cachedRemappings;
    }
    // Get remappings from foundry
    const remappingsTxt = await runCmd("forge remappings");
    const remappings = {};
    const remappingLines = remappingsTxt.split(/\r\n|\r|\n/);
    for (const remappingLine of remappingLines) {
        const fromTo = remappingLine.split("=");
        if (fromTo.length !== 2) {
            continue;
        }
        const [from, to] = fromTo;
        // source names with "node_modules" in it have special treatment in hardhat core, so we skip them
        if (to.includes("node_modules")) {
            continue;
        }
        remappings[from] = to;
    }
    cachedRemappings = remappings;
    return remappings;
}
exports.getRemappings = getRemappings;
async function installDependency(dependency) {
    const cmd = `forge install --no-commit ${dependency}`;
    console.log(`Running '${chalk_1.default.blue(cmd)}'`);
    try {
        await exec(cmd);
    }
    catch (error) {
        throw new ForgeInstallError(dependency, error);
    }
}
exports.installDependency = installDependency;
function runCmdSync(cmd) {
    try {
        return (0, child_process_1.execSync)(cmd, { stdio: "pipe" }).toString();
    }
    catch (error) {
        const pluginError = buildForgeExecutionError(error.status, error.stderr.toString());
        throw pluginError;
    }
}
async function runCmd(cmd) {
    try {
        const { stdout } = await exec(cmd);
        return stdout;
    }
    catch (error) {
        throw buildForgeExecutionError(error.code, error.message);
    }
}
function buildForgeExecutionError(exitCode, message) {
    switch (exitCode) {
        case 127:
            return new HardhatFoundryError("Couldn't run `forge`. Please check that your foundry installation is correct.");
        case 134:
            return new HardhatFoundryError("Running `forge` failed. Please check that your foundry.toml file is correct.");
        default:
            return new HardhatFoundryError(`Unexpected error while running \`forge\`: ${message}`);
    }
}
//# sourceMappingURL=foundry.js.map