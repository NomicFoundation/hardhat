#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const debug_1 = __importDefault(require("debug"));
const semver_1 = __importDefault(require("semver"));
require("source-map-support/register");
const task_names_1 = require("../../builtin-tasks/task-names");
const constants_1 = require("../constants");
const context_1 = require("../context");
const config_loading_1 = require("../core/config/config-loading");
const errors_1 = require("../core/errors");
const errors_list_1 = require("../core/errors-list");
const execution_mode_1 = require("../core/execution-mode");
const env_variables_1 = require("../core/params/env-variables");
const hardhat_params_1 = require("../core/params/hardhat-params");
const project_structure_1 = require("../core/project-structure");
const runtime_environment_1 = require("../core/runtime-environment");
const typescript_support_1 = require("../core/typescript-support");
const reporter_1 = require("../sentry/reporter");
const ci_detection_1 = require("../util/ci-detection");
const global_dir_1 = require("../util/global-dir");
const packageInfo_1 = require("../util/packageInfo");
const antlr_prototype_pollution_workaround_1 = require("../util/antlr-prototype-pollution-workaround");
const analytics_1 = require("./analytics");
const ArgumentsParser_1 = require("./ArgumentsParser");
const emoji_1 = require("./emoji");
const project_creation_1 = require("./project-creation");
const log = (0, debug_1.default)("hardhat:core:cli");
(0, antlr_prototype_pollution_workaround_1.applyWorkaround)();
const ANALYTICS_SLOW_TASK_THRESHOLD = 300;
async function printVersionMessage(packageJson) {
    console.log(packageJson.version);
}
function printWarningAboutNodeJsVersionIfNeceesary(packageJson) {
    const requirement = packageJson.engines.node;
    if (!semver_1.default.satisfies(process.version, requirement)) {
        console.warn(chalk_1.default.yellow(`You are using a version of Node.js that is not supported by Hardhat, and it may work incorrectly, or not work at all.

Please, upgrade your Node.js version.

To learn more about which versions of Node.js are supported go to https://hardhat.org/nodejs-versions`));
    }
}
async function main() {
    // We first accept this argument anywhere, so we know if the user wants
    // stack traces before really parsing the arguments.
    let showStackTraces = process.argv.includes("--show-stack-traces");
    try {
        const packageJson = await (0, packageInfo_1.getPackageJson)();
        printWarningAboutNodeJsVersionIfNeceesary(packageJson);
        const envVariableArguments = (0, env_variables_1.getEnvHardhatArguments)(hardhat_params_1.HARDHAT_PARAM_DEFINITIONS, process.env);
        const argumentsParser = new ArgumentsParser_1.ArgumentsParser();
        const { hardhatArguments, taskName: parsedTaskName, unparsedCLAs, } = argumentsParser.parseHardhatArguments(hardhat_params_1.HARDHAT_PARAM_DEFINITIONS, envVariableArguments, process.argv.slice(2));
        if (hardhatArguments.verbose) {
            reporter_1.Reporter.setVerbose(true);
            debug_1.default.enable("hardhat*");
        }
        if (hardhatArguments.emoji) {
            (0, emoji_1.enableEmoji)();
        }
        showStackTraces = hardhatArguments.showStackTraces;
        if (hardhatArguments.config === undefined && !(0, project_structure_1.isCwdInsideProject)()) {
            if (process.stdout.isTTY === true ||
                process.env.HARDHAT_CREATE_BASIC_SAMPLE_PROJECT_WITH_DEFAULTS !==
                    undefined ||
                process.env.HARDHAT_CREATE_ADVANCED_SAMPLE_PROJECT_WITH_DEFAULTS !==
                    undefined ||
                process.env
                    .HARDHAT_CREATE_ADVANCED_TYPESCRIPT_SAMPLE_PROJECT_WITH_DEFAULTS !==
                    undefined) {
                await (0, project_creation_1.createProject)();
                return;
            }
            // Many terminal emulators in windows fail to run the createProject()
            // workflow, and don't present themselves as TTYs. If we are in this
            // situation we throw a special error instructing the user to use WSL or
            // powershell to initialize the project.
            if (process.platform === "win32") {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.NOT_INSIDE_PROJECT_ON_WINDOWS);
            }
        }
        // --version is a special case
        if (hardhatArguments.version) {
            await printVersionMessage(packageJson);
            return;
        }
        if (!(0, execution_mode_1.isHardhatInstalledLocallyOrLinked)()) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.GENERAL.NON_LOCAL_INSTALLATION);
        }
        if ((0, typescript_support_1.willRunWithTypescript)(hardhatArguments.config)) {
            (0, typescript_support_1.loadTsNode)(hardhatArguments.tsconfig);
        }
        let taskName = parsedTaskName !== null && parsedTaskName !== void 0 ? parsedTaskName : task_names_1.TASK_HELP;
        const showEmptyConfigWarning = true;
        const showSolidityConfigWarnings = taskName === task_names_1.TASK_COMPILE;
        const ctx = context_1.HardhatContext.createHardhatContext();
        const config = (0, config_loading_1.loadConfigAndTasks)(hardhatArguments, {
            showEmptyConfigWarning,
            showSolidityConfigWarnings,
        });
        let telemetryConsent = (0, global_dir_1.hasConsentedTelemetry)();
        const isHelpCommand = hardhatArguments.help || taskName === task_names_1.TASK_HELP;
        if (telemetryConsent === undefined &&
            !isHelpCommand &&
            !(0, ci_detection_1.isRunningOnCiServer)() &&
            process.stdout.isTTY === true) {
            telemetryConsent = await (0, project_creation_1.confirmTelemetryConsent)();
            if (telemetryConsent !== undefined) {
                (0, global_dir_1.writeTelemetryConsent)(telemetryConsent);
            }
        }
        const analytics = await analytics_1.Analytics.getInstance(telemetryConsent);
        reporter_1.Reporter.setConfigPath(config.paths.configFile);
        if (telemetryConsent === true) {
            reporter_1.Reporter.setEnabled(true);
        }
        const envExtenders = ctx.extendersManager.getExtenders();
        const taskDefinitions = ctx.tasksDSL.getTaskDefinitions();
        const [abortAnalytics, hitPromise] = await analytics.sendTaskHit(taskName);
        let taskArguments;
        // --help is a also special case
        if (hardhatArguments.help && taskName !== task_names_1.TASK_HELP) {
            taskArguments = { task: taskName };
            taskName = task_names_1.TASK_HELP;
        }
        else {
            const taskDefinition = taskDefinitions[taskName];
            if (taskDefinition === undefined) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, {
                    task: taskName,
                });
            }
            if (taskDefinition.isSubtask) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.ARGUMENTS.RUNNING_SUBTASK_FROM_CLI, {
                    name: taskDefinition.name,
                });
            }
            taskArguments = argumentsParser.parseTaskArguments(taskDefinition, unparsedCLAs);
        }
        const env = new runtime_environment_1.Environment(config, hardhatArguments, taskDefinitions, envExtenders, ctx.experimentalHardhatNetworkMessageTraceHooks);
        ctx.setHardhatRuntimeEnvironment(env);
        const timestampBeforeRun = new Date().getTime();
        await env.run(taskName, taskArguments);
        const timestampAfterRun = new Date().getTime();
        if (timestampAfterRun - timestampBeforeRun >
            ANALYTICS_SLOW_TASK_THRESHOLD) {
            await hitPromise;
        }
        else {
            abortAnalytics();
        }
        log(`Killing Hardhat after successfully running task ${taskName}`);
    }
    catch (error) {
        let isHardhatError = false;
        if (errors_1.HardhatError.isHardhatError(error)) {
            isHardhatError = true;
            console.error(chalk_1.default.red(`Error ${error.message}`));
        }
        else if (errors_1.HardhatPluginError.isHardhatPluginError(error)) {
            isHardhatError = true;
            console.error(chalk_1.default.red(`Error in plugin ${error.pluginName}: ${error.message}`));
        }
        else if (error instanceof Error) {
            console.error(chalk_1.default.red("An unexpected error occurred:"));
            showStackTraces = true;
        }
        else {
            console.error(chalk_1.default.red("An unexpected error occurred."));
            showStackTraces = true;
        }
        console.log("");
        try {
            reporter_1.Reporter.reportError(error);
        }
        catch (e) {
            log("Couldn't report error to sentry: %O", e);
        }
        if (showStackTraces) {
            console.error(error);
        }
        else {
            if (!isHardhatError) {
                console.error(`If you think this is a bug in Hardhat, please report it here: https://hardhat.org/reportbug`);
            }
            if (errors_1.HardhatError.isHardhatError(error)) {
                const link = `https://hardhat.org/${(0, errors_list_1.getErrorCode)(error.errorDescriptor)}`;
                console.error(`For more info go to ${link} or run ${constants_1.HARDHAT_NAME} with --show-stack-traces`);
            }
            else {
                console.error(`For more info run ${constants_1.HARDHAT_NAME} with --show-stack-traces`);
            }
        }
        await reporter_1.Reporter.close(1000);
        process.exit(1);
    }
}
main()
    .then(() => process.exit(process.exitCode))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map