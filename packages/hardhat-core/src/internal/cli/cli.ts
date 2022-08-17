#!/usr/bin/env node
import chalk from "chalk";
import debug from "debug";
import semver from "semver";
import "source-map-support/register";

import { TASK_COMPILE, TASK_HELP } from "../../builtin-tasks/task-names";
import { TaskArguments } from "../../types";
import { HARDHAT_NAME } from "../constants";
import { HardhatContext } from "../context";
import { loadConfigAndTasks } from "../core/config/config-loading";
import { HardhatError, HardhatPluginError } from "../core/errors";
import { ERRORS, getErrorCode } from "../core/errors-list";
import { isHardhatInstalledLocallyOrLinked } from "../core/execution-mode";
import { getEnvHardhatArguments } from "../core/params/env-variables";
import { HARDHAT_PARAM_DEFINITIONS } from "../core/params/hardhat-params";
import { isCwdInsideProject } from "../core/project-structure";
import { Environment } from "../core/runtime-environment";
import { loadTsNode, willRunWithTypescript } from "../core/typescript-support";
import { Reporter } from "../sentry/reporter";
import { isRunningOnCiServer } from "../util/ci-detection";
import {
  hasConsentedTelemetry,
  hasPromptedForHHVSCode,
  writePromptedForHHVSCode,
  writeTelemetryConsent,
} from "../util/global-dir";
import { getPackageJson, PackageJson } from "../util/packageInfo";

import { applyWorkaround } from "../util/antlr-prototype-pollution-workaround";
import { Analytics } from "./analytics";
import { ArgumentsParser } from "./ArgumentsParser";
import { enableEmoji } from "./emoji";
import { createProject } from "./project-creation";
import { confirmHHVSCodeInstallation, confirmTelemetryConsent } from "./prompt";
import {
  InstallationState,
  installHardhatVSCode,
  isHardhatVSCodeInstalled,
} from "./hardhat-vscode-installation";

const log = debug("hardhat:core:cli");

applyWorkaround();

const ANALYTICS_SLOW_TASK_THRESHOLD = 300;

async function printVersionMessage(packageJson: PackageJson) {
  console.log(packageJson.version);
}

function printWarningAboutNodeJsVersionIfNecessary(packageJson: PackageJson) {
  const requirement = packageJson.engines.node;
  if (!semver.satisfies(process.version, requirement)) {
    console.warn(
      chalk.yellow(
        `You are using a version of Node.js that is not supported by Hardhat, and it may work incorrectly, or not work at all.

Please, make sure you are using a supported version of Node.js.

To learn more about which versions of Node.js are supported go to https://hardhat.org/nodejs-versions`
      )
    );
  }
}

async function suggestInstallingHardhatVscode() {
  const alreadyPrompted = hasPromptedForHHVSCode();
  if (alreadyPrompted) {
    return;
  }

  const isInstalled = isHardhatVSCodeInstalled();
  writePromptedForHHVSCode();

  if (isInstalled !== InstallationState.EXTENSION_NOT_INSTALLED) {
    return;
  }

  const installationConsent = await confirmHHVSCodeInstallation();

  if (installationConsent === true) {
    console.log("Installing Hardhat for Visual Studio Code...");
    const installed = installHardhatVSCode();

    if (installed) {
      console.log("Hardhat for Visual Studio Code was successfully installed");
    } else {
      console.log(
        "Hardhat for Visual Studio Code couldn't be installed. To learn more about it, go to https://hardhat.org/hardhat-vscode"
      );
    }
  } else {
    console.log(
      "To learn more about Hardhat for Visual Studio Code, go to https://hardhat.org/hardhat-vscode"
    );
  }
}

async function main() {
  // We first accept this argument anywhere, so we know if the user wants
  // stack traces before really parsing the arguments.
  let showStackTraces = process.argv.includes("--show-stack-traces");

  try {
    const packageJson = await getPackageJson();

    printWarningAboutNodeJsVersionIfNecessary(packageJson);

    const envVariableArguments = getEnvHardhatArguments(
      HARDHAT_PARAM_DEFINITIONS,
      process.env
    );

    const argumentsParser = new ArgumentsParser();

    const {
      hardhatArguments,
      taskName: parsedTaskName,
      unparsedCLAs,
    } = argumentsParser.parseHardhatArguments(
      HARDHAT_PARAM_DEFINITIONS,
      envVariableArguments,
      process.argv.slice(2)
    );

    if (hardhatArguments.verbose) {
      Reporter.setVerbose(true);
      debug.enable("hardhat*");
    }

    if (hardhatArguments.emoji) {
      enableEmoji();
    }

    showStackTraces = hardhatArguments.showStackTraces;

    // --version is a special case
    if (hardhatArguments.version) {
      await printVersionMessage(packageJson);
      return;
    }

    if (hardhatArguments.config === undefined && !isCwdInsideProject()) {
      if (
        process.stdout.isTTY === true ||
        process.env.HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS !==
          undefined ||
        process.env.HARDHAT_CREATE_TYPESCRIPT_PROJECT_WITH_DEFAULTS !==
          undefined
      ) {
        await createProject();
        return;
      }

      // Many terminal emulators in windows fail to run the createProject()
      // workflow, and don't present themselves as TTYs. If we are in this
      // situation we throw a special error instructing the user to use WSL or
      // powershell to initialize the project.
      if (process.platform === "win32") {
        throw new HardhatError(ERRORS.GENERAL.NOT_INSIDE_PROJECT_ON_WINDOWS);
      }
    }

    if (!isHardhatInstalledLocallyOrLinked()) {
      throw new HardhatError(ERRORS.GENERAL.NON_LOCAL_INSTALLATION);
    }

    if (willRunWithTypescript(hardhatArguments.config)) {
      loadTsNode(hardhatArguments.tsconfig);
    }

    let taskName = parsedTaskName ?? TASK_HELP;

    const showEmptyConfigWarning = true;
    const showSolidityConfigWarnings = taskName === TASK_COMPILE;

    const ctx = HardhatContext.createHardhatContext();

    const { resolvedConfig, userConfig } = loadConfigAndTasks(
      hardhatArguments,
      {
        showEmptyConfigWarning,
        showSolidityConfigWarnings,
      }
    );

    let telemetryConsent: boolean | undefined = hasConsentedTelemetry();

    const isHelpCommand = hardhatArguments.help || taskName === TASK_HELP;
    if (
      telemetryConsent === undefined &&
      !isHelpCommand &&
      !isRunningOnCiServer() &&
      process.stdout.isTTY === true
    ) {
      telemetryConsent = await confirmTelemetryConsent();

      if (telemetryConsent !== undefined) {
        writeTelemetryConsent(telemetryConsent);
      }
    }

    const analytics = await Analytics.getInstance(telemetryConsent);

    Reporter.setConfigPath(resolvedConfig.paths.configFile);
    if (telemetryConsent === true) {
      Reporter.setEnabled(true);
    }

    const envExtenders = ctx.extendersManager.getExtenders();
    const taskDefinitions = ctx.tasksDSL.getTaskDefinitions();

    const [abortAnalytics, hitPromise] = await analytics.sendTaskHit(taskName);

    let taskArguments: TaskArguments;

    // --help is a also special case
    if (hardhatArguments.help && taskName !== TASK_HELP) {
      taskArguments = { task: taskName };
      taskName = TASK_HELP;
    } else {
      const taskDefinition = taskDefinitions[taskName];

      if (taskDefinition === undefined) {
        throw new HardhatError(ERRORS.ARGUMENTS.UNRECOGNIZED_TASK, {
          task: taskName,
        });
      }

      if (taskDefinition.isSubtask) {
        throw new HardhatError(ERRORS.ARGUMENTS.RUNNING_SUBTASK_FROM_CLI, {
          name: taskDefinition.name,
        });
      }

      taskArguments = argumentsParser.parseTaskArguments(
        taskDefinition,
        unparsedCLAs
      );
    }

    const env = new Environment(
      resolvedConfig,
      hardhatArguments,
      taskDefinitions,
      envExtenders,
      ctx.experimentalHardhatNetworkMessageTraceHooks,
      userConfig
    );

    ctx.setHardhatRuntimeEnvironment(env);

    const timestampBeforeRun = new Date().getTime();

    await env.run(taskName, taskArguments);

    const timestampAfterRun = new Date().getTime();
    if (
      timestampAfterRun - timestampBeforeRun >
      ANALYTICS_SLOW_TASK_THRESHOLD
    ) {
      await hitPromise;
    } else {
      abortAnalytics();
    }

    // VSCode extension prompt for installation
    if (
      taskName === "test" &&
      !isRunningOnCiServer() &&
      process.stdout.isTTY === true
    ) {
      await suggestInstallingHardhatVscode();
    }

    log(`Killing Hardhat after successfully running task ${taskName}`);
  } catch (error) {
    let isHardhatError = false;

    if (HardhatError.isHardhatError(error)) {
      isHardhatError = true;
      console.error(chalk.red(`Error ${error.message}`));
    } else if (HardhatPluginError.isHardhatPluginError(error)) {
      isHardhatError = true;
      console.error(
        chalk.red(`Error in plugin ${error.pluginName}: ${error.message}`)
      );
    } else if (error instanceof Error) {
      console.error(chalk.red("An unexpected error occurred:"));
      showStackTraces = true;
    } else {
      console.error(chalk.red("An unexpected error occurred."));
      showStackTraces = true;
    }

    console.log("");

    try {
      Reporter.reportError(error as Error);
    } catch (e) {
      log("Couldn't report error to sentry: %O", e);
    }

    if (showStackTraces) {
      console.error(error);
    } else {
      if (!isHardhatError) {
        console.error(
          `If you think this is a bug in Hardhat, please report it here: https://hardhat.org/report-bug`
        );
      }

      if (HardhatError.isHardhatError(error)) {
        const link = `https://hardhat.org/${getErrorCode(
          error.errorDescriptor
        )}`;

        console.error(
          `For more info go to ${link} or run ${HARDHAT_NAME} with --show-stack-traces`
        );
      } else {
        console.error(
          `For more info run ${HARDHAT_NAME} with --show-stack-traces`
        );
      }
    }

    await Reporter.close(1000);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(process.exitCode))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
