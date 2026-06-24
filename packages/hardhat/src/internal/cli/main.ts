import type { DebugLogger } from "@nomicfoundation/hardhat-utils/debug";

import { fileURLToPath } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { getRealPath } from "@nomicfoundation/hardhat-utils/fs";
import {
  findClosestPackageJson,
  findDependencyPackageJson,
  readClosestPackageJson,
} from "@nomicfoundation/hardhat-utils/package";
import { register } from "tsx/esm/api";

import { isResult } from "../../utils/result.js";
import { BUILTIN_GLOBAL_OPTIONS_DEFINITIONS } from "../builtin-global-options.js";
import { builtinPlugins } from "../builtin-plugins/index.js";
import {
  importUserConfig,
  resolveHardhatConfigPath,
} from "../config-loading.js";
import { buildGlobalOptionDefinitions } from "../core/global-options.js";
import { resolveProjectRoot } from "../core/hre.js";
import { resolvePluginList } from "../core/plugins/resolve-plugin-list.js";
import { warnAboutUnusedLoadedPlugins } from "../core/plugins/unused-plugins-warning.js";
import { setGlobalHardhatRuntimeEnvironment } from "../global-hre-instance.js";
import { createHardhatRuntimeEnvironment } from "../hre-initialization.js";

import { printErrorMessages } from "./error-handler.js";
import { getGlobalHelpString } from "./help/get-global-help-string.js";
import { getHelpString } from "./help/get-help-string.js";
import {
  parseBuiltinGlobalOptions,
  parseGlobalOptions,
  parseRawArguments,
  parseTask,
  parseTaskArguments,
} from "./parser.js";
import { sendTaskAnalytics } from "./telemetry/analytics/analytics.js";
import { setupGlobalUnhandledErrorHandlers } from "./telemetry/error-reporter/global-error-handlers.js";
import {
  sendErrorTelemetry,
  setCliHardhatConfigPath,
} from "./telemetry/error-reporter/reporter.js";
import { printVersionMessage } from "./version.js";

export interface MainOptions {
  print?: (message: string) => void;
  registerTsx?: boolean;
  rethrowErrors?: true;
  allowNonlocalHardhatInstallation?: true;
  warnAboutUnusedPlugins?: true;
}

export async function main(
  rawArguments: string[],
  options: MainOptions = {},
): Promise<void> {
  // We set up the global unhandled errors before running any functionality
  setupGlobalUnhandledErrorHandlers();

  const print = options.print ?? console.log;

  const log = createDebug("hardhat:core:cli:main");

  let builtinGlobalOptions;
  let configPath;

  log("Hardhat CLI started");

  try {
    const cliArguments = parseRawArguments(rawArguments);

    const usedCliArguments: boolean[] = new Array(cliArguments.length).fill(
      false,
    );

    builtinGlobalOptions = await parseBuiltinGlobalOptions(
      cliArguments,
      usedCliArguments,
    );

    log("Parsed builtin global options");

    if (builtinGlobalOptions.version) {
      return await printVersionMessage(print);
    }

    if (builtinGlobalOptions.init) {
      const { initHardhat, initHardhat3NonInteractive, printTemplatesList } =
        await import("./init/init.js");

      let templateName: string | undefined;
      let listTemplates = false;

      for (let i = 0; i < cliArguments.length; i++) {
        if (usedCliArguments[i]) {
          continue;
        }

        if (cliArguments[i] === "--templates") {
          usedCliArguments[i] = true;
          listTemplates = true;
        }
      }

      for (let i = 0; i < cliArguments.length; i++) {
        if (usedCliArguments[i]) {
          continue;
        }

        if (cliArguments[i] === "--template") {
          usedCliArguments[i] = true;

          if (templateName !== undefined) {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
              { name: "--template" },
            );
          }

          if (listTemplates) {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_COMBINE_TEMPLATE_AND_TEMPLATES,
            );
          }

          if (
            usedCliArguments[i + 1] === undefined ||
            usedCliArguments[i + 1] === true ||
            cliArguments[i + 1] === undefined ||
            cliArguments[i + 1].startsWith("-")
          ) {
            throw new HardhatError(
              HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
              { argument: "--template" },
            );
          }

          templateName = cliArguments[i + 1];
          i++;
          usedCliArguments[i] = true;
        }
      }

      if (listTemplates) {
        return await printTemplatesList("hardhat-3", print);
      }

      if (templateName !== undefined) {
        return await initHardhat3NonInteractive({ template: templateName });
      }

      return await initHardhat();
    }

    configPath = await resolveHardhatConfigPath(
      builtinGlobalOptions.configPath,
    );

    if (
      options.allowNonlocalHardhatInstallation !== true &&
      !(await isHardhatInstalledLocallyOrLinked(configPath, log))
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.GENERAL.NON_LOCAL_INSTALLATION,
      );
    }

    setCliHardhatConfigPath(configPath);

    const projectRoot = await resolveProjectRoot(configPath);

    const esmErrorPrinted = await printEsmErrorMessageIfNecessary(
      projectRoot,
      print,
    );

    if (esmErrorPrinted) {
      process.exitCode = 1;
      return;
    }

    if (options.registerTsx === true) {
      register();
    }

    const userConfig = await importUserConfig(configPath);

    log("User config imported");

    const configPlugins = Array.isArray(userConfig.plugins)
      ? userConfig.plugins
      : [];
    const plugins = [...builtinPlugins, ...configPlugins];
    const resolvedPlugins = await resolvePluginList(projectRoot, plugins);

    log("Resolved plugins");

    const pluginGlobalOptionDefinitions =
      buildGlobalOptionDefinitions(resolvedPlugins);

    const globalOptionDefinitions = new Map([
      ...BUILTIN_GLOBAL_OPTIONS_DEFINITIONS,
      ...pluginGlobalOptionDefinitions,
    ]);

    const userProvidedGlobalOptions = await parseGlobalOptions(
      globalOptionDefinitions,
      cliArguments,
      usedCliArguments,
    );

    log("Creating Hardhat Runtime Environment");

    const hre = await createHardhatRuntimeEnvironment(
      userConfig,
      {
        ...builtinGlobalOptions,
        config: configPath,
        ...userProvidedGlobalOptions,
      },
      projectRoot,
      { resolvedPlugins, globalOptionDefinitions },
    );

    if (options.warnAboutUnusedPlugins) {
      warnAboutUnusedLoadedPlugins(hre.config.plugins);
    }

    // This must be the first time we set it, otherwise we let it crash
    setGlobalHardhatRuntimeEnvironment(hre);

    const taskOrId = parseTask(
      cliArguments,
      usedCliArguments,
      hre.tasks.rootTasks,
    );

    if (Array.isArray(taskOrId)) {
      if (taskOrId.length === 0) {
        const globalHelp = await getGlobalHelpString(
          hre.tasks.rootTasks,
          globalOptionDefinitions,
        );

        print(globalHelp);
        return;
      }

      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.TASK_NOT_FOUND,
        { task: taskOrId.join(" ") },
      );
    }

    const task = taskOrId;

    if (task.isEmpty && usedCliArguments.includes(false)) {
      const invalidSubtask = cliArguments[usedCliArguments.indexOf(false)];

      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.UNRECOGNIZED_SUBTASK,
        {
          task: task.id.join(" "),
          invalidSubtask,
        },
      );
    }

    if (builtinGlobalOptions.help || task.isEmpty) {
      const taskHelp = await getHelpString(task, globalOptionDefinitions);

      print(taskHelp);
      return;
    }

    const taskArguments = parseTaskArguments(
      cliArguments,
      usedCliArguments,
      task,
    );

    log(`Running task "${task.id.join(" ")}"`);

    const [taskResult] = await Promise.all([
      task.run(taskArguments),
      sendTaskAnalytics(task.id, "hardhat"),
    ]);

    if (isResult(taskResult) && !taskResult.success) {
      process.exitCode = 1;
    }

    if (!isCi() && process.stdout.isTTY === true) {
      try {
        const { BannerManager } = await import("./banner-manager.js");
        const bannerManager = await BannerManager.getInstance();
        await bannerManager.showBanner(200);
      } catch (bannerError) {
        log("Error showing banner", bannerError);
      }
    }

    const deprecatedConnectWasCalled = Boolean(
      "wasConnectCalled" in hre.network &&
        hre.network.wasConnectCalled !== undefined &&
        typeof hre.network.wasConnectCalled === "function" &&
        hre.network.wasConnectCalled(),
    );

    if (deprecatedConnectWasCalled) {
      console.warn(
        "WARNING: hre.network.connect() is deprecated and will be removed in a future version. " +
          "Use hre.network.create() or hre.network.getOrCreate() instead.",
      );
    }
  } catch (error) {
    ensureError(error);
    await printErrorMessages(error, builtinGlobalOptions?.showStackTraces);

    try {
      await sendErrorTelemetry(error);
    } catch (e) {
      log("Couldn't report error to sentry: %O", e);
    }

    if (options.rethrowErrors) {
      throw error;
    }

    process.exitCode = 1;
  }
}

/**
 * Returns true if Hardhat is installed locally or linked from its repository,
 * by looking for it using the node module resolution logic.
 *
 * If a config file is provided, we start looking for it from there. Otherwise,
 * we use the current working directory.
 */
async function isHardhatInstalledLocallyOrLinked(
  configPath: string,
  log: DebugLogger,
): Promise<boolean> {
  try {
    // Based on Node.js resolution algorithm find the real path
    // of the project's version of Hardhat
    const realPathToResolvedPackageJson = await findDependencyPackageJson(
      configPath ?? process.cwd(),
      "hardhat",
    );

    // Find the executing code's Hardhat Package.json
    const thisPackageJson = await findClosestPackageJson(
      fileURLToPath(import.meta.url),
    );

    // We need to get the realpaths here, as hardhat may be linked and
    // running with `node --preserve-symlinks`
    const isLocalOrLinked =
      realPathToResolvedPackageJson === (await getRealPath(thisPackageJson));

    if (!isLocalOrLinked) {
      log("Determined that Hardhat is not installed locally/linked");
      log(`  resolved package.json: ${realPathToResolvedPackageJson}`);
      log(`  current package.json: ${thisPackageJson}`);
    }

    return isLocalOrLinked;
  } catch (error) {
    log("Error during installed locally/linked test", error);
    return false;
  }
}

/**
 * Prints an error message if the user is running Hardhat on CJS mode, returning
 * `true` if the message was printed.
 */
async function printEsmErrorMessageIfNecessary(
  projectRoot: string,
  print: (message: string) => void,
): Promise<boolean> {
  const packageJson = await readClosestPackageJson(projectRoot);

  if (packageJson.type !== "module") {
    print(`Hardhat only supports ESM projects.

Please make sure you have \`"type": "module"\` in your package.json.

You can set it automatically by running:

npm pkg set type="module"
`);

    return true;
  }

  return false;
}
