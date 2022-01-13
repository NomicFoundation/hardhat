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
exports.confirmTelemetryConsent = exports.createProject = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../constants");
const default_config_1 = require("../core/config/default-config");
const errors_1 = require("../core/errors");
const errors_list_1 = require("../core/errors-list");
const project_structure_1 = require("../core/project-structure");
const global_dir_1 = require("../util/global-dir");
const lang_1 = require("../util/lang");
const packageInfo_1 = require("../util/packageInfo");
const emoji_1 = require("./emoji");
var Action;
(function (Action) {
    Action["CREATE_BASIC_SAMPLE_PROJECT_ACTION"] = "Create a basic sample project";
    Action["CREATE_ADVANCED_SAMPLE_PROJECT_ACTION"] = "Create an advanced sample project";
    Action["CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_ACTION"] = "Create an advanced sample project that uses TypeScript";
    Action["CREATE_EMPTY_HARDHAT_CONFIG_ACTION"] = "Create an empty hardhat.config.js";
    Action["QUIT_ACTION"] = "Quit";
})(Action || (Action = {}));
const HARDHAT_PACKAGE_NAME = "hardhat";
const BASIC_SAMPLE_PROJECT_DEPENDENCIES = {
    "@nomiclabs/hardhat-waffle": "^2.0.0",
    "ethereum-waffle": "^3.0.0",
    chai: "^4.2.0",
    "@nomiclabs/hardhat-ethers": "^2.0.0",
    ethers: "^5.0.0",
};
const ADVANCED_SAMPLE_PROJECT_DEPENDENCIES = Object.assign(Object.assign({}, BASIC_SAMPLE_PROJECT_DEPENDENCIES), { "@nomiclabs/hardhat-etherscan": "^2.1.3", dotenv: "^10.0.0", eslint: "^7.29.0", "eslint-config-prettier": "^8.3.0", "eslint-config-standard": "^16.0.3", "eslint-plugin-import": "^2.23.4", "eslint-plugin-node": "^11.1.0", "eslint-plugin-prettier": "^3.4.0", "eslint-plugin-promise": "^5.1.0", "hardhat-gas-reporter": "^1.0.4", prettier: "^2.3.2", "prettier-plugin-solidity": "^1.0.0-beta.13", solhint: "^3.3.6", "solidity-coverage": "^0.7.16" });
const ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_DEPENDENCIES = Object.assign(Object.assign({}, ADVANCED_SAMPLE_PROJECT_DEPENDENCIES), { "@typechain/ethers-v5": "^7.0.1", "@typechain/hardhat": "^2.3.0", "@typescript-eslint/eslint-plugin": "^4.29.1", "@typescript-eslint/parser": "^4.29.1", "@types/chai": "^4.2.21", "@types/node": "^12.0.0", "@types/mocha": "^9.0.0", "ts-node": "^10.1.0", typechain: "^5.1.2", typescript: "^4.5.2" });
const SAMPLE_PROJECT_DEPENDENCIES = {
    [Action.CREATE_BASIC_SAMPLE_PROJECT_ACTION]: BASIC_SAMPLE_PROJECT_DEPENDENCIES,
    [Action.CREATE_ADVANCED_SAMPLE_PROJECT_ACTION]: ADVANCED_SAMPLE_PROJECT_DEPENDENCIES,
    [Action.CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_ACTION]: ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_DEPENDENCIES,
};
const TELEMETRY_CONSENT_TIMEOUT = 10000;
async function removeProjectDirIfPresent(projectRoot, dirName) {
    const dirPath = path_1.default.join(projectRoot, dirName);
    if (await fs_extra_1.default.pathExists(dirPath)) {
        await fs_extra_1.default.remove(dirPath);
    }
}
async function removeTempFilesIfPresent(projectRoot) {
    await removeProjectDirIfPresent(projectRoot, "cache");
    await removeProjectDirIfPresent(projectRoot, "artifacts");
}
// generated with the "colossal" font
function printAsciiLogo() {
    console.log(chalk_1.default.blue("888    888                      888 888               888"));
    console.log(chalk_1.default.blue("888    888                      888 888               888"));
    console.log(chalk_1.default.blue("888    888                      888 888               888"));
    console.log(chalk_1.default.blue("8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888"));
    console.log(chalk_1.default.blue('888    888     "88b 888P"  d88" 888 888 "88b     "88b 888'));
    console.log(chalk_1.default.blue("888    888 .d888888 888    888  888 888  888 .d888888 888"));
    console.log(chalk_1.default.blue("888    888 888  888 888    Y88b 888 888  888 888  888 Y88b."));
    console.log(chalk_1.default.blue('888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888'));
    console.log("");
}
async function printWelcomeMessage() {
    const packageJson = await (0, packageInfo_1.getPackageJson)();
    console.log(chalk_1.default.cyan(`${(0, emoji_1.emoji)("👷 ")}Welcome to ${constants_1.HARDHAT_NAME} v${packageJson.version}${(0, emoji_1.emoji)(" 👷‍")}\n`));
}
async function copySampleProject(projectRoot, projectType) {
    const packageRoot = (0, packageInfo_1.getPackageRoot)();
    // first copy the basic project, then, if an advanced project is what was
    // requested, overlay the advanced files on top of the basic ones. then, if
    // the advanced TypeScript project is what was requested, overlay those files
    // on top of the advanced ones.
    await fs_extra_1.default.ensureDir(projectRoot);
    await fs_extra_1.default.copy(path_1.default.join(packageRoot, "sample-projects", "basic"), projectRoot);
    if (projectType === Action.CREATE_ADVANCED_SAMPLE_PROJECT_ACTION ||
        projectType === Action.CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_ACTION) {
        await fs_extra_1.default.copy(path_1.default.join(packageRoot, "sample-projects", "advanced"), projectRoot);
        await fs_extra_1.default.remove(path_1.default.join(projectRoot, "scripts", "sample-script.js"));
        await fs_extra_1.default.move(path_1.default.join(projectRoot, "npmignore"), path_1.default.join(projectRoot, ".npmignore"), { overwrite: true });
    }
    if (projectType === Action.CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_ACTION) {
        await fs_extra_1.default.copy(path_1.default.join(packageRoot, "sample-projects", "advanced-ts"), projectRoot);
        for (const jsFile of [
            "hardhat.config.js",
            path_1.default.join("scripts", "deploy.js"),
            path_1.default.join("test", "sample-test.js"),
        ]) {
            await fs_extra_1.default.remove(jsFile);
        }
        await fs_extra_1.default.move(path_1.default.join(projectRoot, "npmignore"), path_1.default.join(projectRoot, ".npmignore"), { overwrite: true });
    }
    // This is just in case we have been using the sample project for dev/testing
    await removeTempFilesIfPresent(projectRoot);
    await fs_extra_1.default.remove(path_1.default.join(projectRoot, "LICENSE.md"));
}
async function addGitIgnore(projectRoot) {
    const gitIgnorePath = path_1.default.join(projectRoot, ".gitignore");
    let content = await (0, project_structure_1.getRecommendedGitIgnore)();
    if (await fs_extra_1.default.pathExists(gitIgnorePath)) {
        const existingContent = await fs_extra_1.default.readFile(gitIgnorePath, "utf-8");
        content = `${existingContent}
${content}`;
    }
    await fs_extra_1.default.writeFile(gitIgnorePath, content);
}
async function printRecommendedDepsInstallationInstructions(projectType) {
    console.log(`You need to install these dependencies to run the sample project:`);
    const cmd = await getRecommendedDependenciesInstallationCommand(await getDependencies(projectType));
    console.log(`  ${cmd.join(" ")}`);
}
async function writeEmptyHardhatConfig() {
    return fs_extra_1.default.writeFile("hardhat.config.js", `/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "${default_config_1.DEFAULT_SOLC_VERSION}",
};
`, "utf-8");
}
async function getAction() {
    if (process.env.HARDHAT_CREATE_BASIC_SAMPLE_PROJECT_WITH_DEFAULTS !== undefined) {
        return Action.CREATE_BASIC_SAMPLE_PROJECT_ACTION;
    }
    else if (process.env.HARDHAT_CREATE_ADVANCED_SAMPLE_PROJECT_WITH_DEFAULTS !==
        undefined) {
        return Action.CREATE_ADVANCED_SAMPLE_PROJECT_ACTION;
    }
    else if (process.env
        .HARDHAT_CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_WITH_DEFAULTS !==
        undefined) {
        return Action.CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_ACTION;
    }
    const { default: enquirer } = await Promise.resolve().then(() => __importStar(require("enquirer")));
    try {
        const actionResponse = await enquirer.prompt([
            {
                name: "action",
                type: "select",
                message: "What do you want to do?",
                initial: 0,
                choices: Object.values(Action).map((a) => {
                    return { name: a, message: a, value: a };
                }),
            },
        ]);
        if (Object.values(Action).includes(actionResponse.action)) {
            return actionResponse.action;
        }
        else {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.UNSUPPORTED_OPERATION, {
                operation: `Responding with "${actionResponse.action}" to the project initialization wizard`,
            });
        }
    }
    catch (e) {
        if (e === "") {
            return Action.QUIT_ACTION;
        }
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw e;
    }
}
async function createPackageJson() {
    await fs_extra_1.default.writeJson("package.json", {
        name: "hardhat-project",
    }, { spaces: 2 });
}
async function createProject() {
    const { default: enquirer } = await Promise.resolve().then(() => __importStar(require("enquirer")));
    printAsciiLogo();
    await printWelcomeMessage();
    const action = await getAction();
    if (action === Action.QUIT_ACTION) {
        return;
    }
    if (!(await fs_extra_1.default.pathExists("package.json"))) {
        await createPackageJson();
    }
    if (action === Action.CREATE_EMPTY_HARDHAT_CONFIG_ACTION) {
        await writeEmptyHardhatConfig();
        console.log(`${(0, emoji_1.emoji)("✨ ")}${chalk_1.default.cyan(`Config file created`)}${(0, emoji_1.emoji)(" ✨")}`);
        if (!isInstalled(HARDHAT_PACKAGE_NAME)) {
            console.log("");
            console.log(`You need to install hardhat locally to use it. Please run:`);
            const cmd = await getRecommendedDependenciesInstallationCommand({
                [HARDHAT_PACKAGE_NAME]: `^${(await (0, packageInfo_1.getPackageJson)()).version}`,
            });
            console.log("");
            console.log(cmd.join(" "));
            console.log("");
        }
        return;
    }
    let responses;
    const useDefaultPromptResponses = process.env.HARDHAT_CREATE_BASIC_SAMPLE_PROJECT_WITH_DEFAULTS !==
        undefined ||
        process.env.HARDHAT_CREATE_ADVANCED_SAMPLE_PROJECT_WITH_DEFAULTS !==
            undefined ||
        process.env
            .HARDHAT_CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_WITH_DEFAULTS !==
            undefined;
    if (useDefaultPromptResponses) {
        responses = {
            projectRoot: process.cwd(),
            shouldAddGitIgnore: true,
        };
    }
    else {
        try {
            responses = await enquirer.prompt([
                {
                    name: "projectRoot",
                    type: "input",
                    initial: process.cwd(),
                    message: "Hardhat project root:",
                },
                createConfirmationPrompt("shouldAddGitIgnore", "Do you want to add a .gitignore?"),
            ]);
        }
        catch (e) {
            if (e === "") {
                return;
            }
            // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
            throw e;
        }
    }
    const { projectRoot, shouldAddGitIgnore } = responses;
    await copySampleProject(projectRoot, action);
    if (shouldAddGitIgnore) {
        await addGitIgnore(projectRoot);
    }
    if ((0, global_dir_1.hasConsentedTelemetry)() === undefined) {
        const telemetryConsent = await confirmTelemetryConsent();
        if (telemetryConsent !== undefined) {
            (0, global_dir_1.writeTelemetryConsent)(telemetryConsent);
        }
    }
    let shouldShowInstallationInstructions = true;
    if (await canInstallRecommendedDeps()) {
        const dependencies = await getDependencies(action /* type cast feels okay here
        because we already returned from this function if it isn't valid. */);
        const recommendedDeps = Object.keys(dependencies);
        const dependenciesToInstall = (0, lang_1.fromEntries)(Object.entries(dependencies).filter(([name]) => !isInstalled(name)));
        const installedRecommendedDeps = recommendedDeps.filter(isInstalled);
        const installedExceptHardhat = installedRecommendedDeps.filter((name) => name !== HARDHAT_PACKAGE_NAME);
        if (installedRecommendedDeps.length === recommendedDeps.length) {
            shouldShowInstallationInstructions = false;
        }
        else if (installedExceptHardhat.length === 0) {
            const shouldInstall = useDefaultPromptResponses ||
                (await confirmRecommendedDepsInstallation(dependenciesToInstall));
            if (shouldInstall) {
                const installed = await installRecommendedDependencies(dependenciesToInstall);
                if (!installed) {
                    console.warn(chalk_1.default.red("Failed to install the sample project's dependencies"));
                }
                shouldShowInstallationInstructions = !installed;
            }
        }
    }
    if (shouldShowInstallationInstructions) {
        console.log(``);
        await printRecommendedDepsInstallationInstructions(action);
    }
    console.log(`\n${(0, emoji_1.emoji)("✨ ")}${chalk_1.default.cyan("Project created")}${(0, emoji_1.emoji)(" ✨")}`);
    console.log("See the README.md file for some example tasks you can run.");
}
exports.createProject = createProject;
function createConfirmationPrompt(name, message) {
    return {
        type: "confirm",
        name,
        message,
        initial: "y",
        default: "(Y/n)",
        isTrue(input) {
            if (typeof input === "string") {
                return input.toLowerCase() === "y";
            }
            return input;
        },
        isFalse(input) {
            if (typeof input === "string") {
                return input.toLowerCase() === "n";
            }
            return input;
        },
        format() {
            const that = this;
            const value = that.value === true ? "y" : "n";
            if (that.state.submitted === true) {
                return that.styles.submitted(value);
            }
            return value;
        },
    };
}
async function canInstallRecommendedDeps() {
    return ((await fs_extra_1.default.pathExists("package.json")) &&
        // TODO: Figure out why this doesn't work on Win
        // cf. https://github.com/nomiclabs/hardhat/issues/1698
        os_1.default.type() !== "Windows_NT");
}
function isInstalled(dep) {
    const packageJson = fs_extra_1.default.readJSONSync("package.json");
    const allDependencies = Object.assign(Object.assign(Object.assign({}, packageJson.dependencies), packageJson.devDependencies), packageJson.optionalDependencies);
    return dep in allDependencies;
}
async function isYarnProject() {
    return fs_extra_1.default.pathExists("yarn.lock");
}
async function installRecommendedDependencies(dependencies) {
    console.log("");
    // The reason we don't quote the dependencies here is because they are going
    // to be used in child_process.sapwn, which doesn't require escaping string,
    // and can actually fail if you do.
    const installCmd = await getRecommendedDependenciesInstallationCommand(dependencies, false);
    return installDependencies(installCmd[0], installCmd.slice(1));
}
async function confirmRecommendedDepsInstallation(depsToInstall) {
    const { default: enquirer } = await Promise.resolve().then(() => __importStar(require("enquirer")));
    let responses;
    const packageManager = (await isYarnProject()) ? "yarn" : "npm";
    try {
        responses = await enquirer.prompt([
            createConfirmationPrompt("shouldInstallPlugin", `Do you want to install this sample project's dependencies with ${packageManager} (${Object.keys(depsToInstall).join(" ")})?`),
        ]);
    }
    catch (e) {
        if (e === "") {
            return false;
        }
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw e;
    }
    return responses.shouldInstallPlugin;
}
async function confirmTelemetryConsent() {
    const enquirer = require("enquirer");
    const prompt = new enquirer.prompts.Confirm({
        name: "telemetryConsent",
        type: "confirm",
        initial: true,
        message: "Help us improve Hardhat with anonymous crash reports & basic usage data?",
    });
    let timeout;
    const timeoutPromise = new Promise((resolve) => {
        timeout = setTimeout(resolve, TELEMETRY_CONSENT_TIMEOUT);
    });
    const result = await Promise.race([prompt.run(), timeoutPromise]);
    clearTimeout(timeout);
    if (result === undefined) {
        await prompt.cancel();
    }
    return result;
}
exports.confirmTelemetryConsent = confirmTelemetryConsent;
async function installDependencies(packageManager, args) {
    const { spawn } = await Promise.resolve().then(() => __importStar(require("child_process")));
    console.log(`${packageManager} ${args.join(" ")}`);
    const childProcess = spawn(packageManager, args, {
        stdio: "inherit", // There's an error in the TS definition of ForkOptions
    });
    return new Promise((resolve, reject) => {
        childProcess.once("close", (status) => {
            childProcess.removeAllListeners("error");
            if (status === 0) {
                resolve(true);
                return;
            }
            reject(false);
        });
        childProcess.once("error", (_status) => {
            childProcess.removeAllListeners("close");
            reject(false);
        });
    });
}
async function getRecommendedDependenciesInstallationCommand(dependencies, quoteDependencies = true) {
    const deps = Object.entries(dependencies).map(([name, version]) => quoteDependencies ? `"${name}@${version}"` : `${name}@${version}`);
    if (await isYarnProject()) {
        return ["yarn", "add", "--dev", ...deps];
    }
    return ["npm", "install", "--save-dev", ...deps];
}
async function getDependencies(projectType) {
    return Object.assign({ [HARDHAT_PACKAGE_NAME]: `^${(await (0, packageInfo_1.getPackageJson)()).version}` }, SAMPLE_PROJECT_DEPENDENCIES[projectType]);
}
//# sourceMappingURL=project-creation.js.map