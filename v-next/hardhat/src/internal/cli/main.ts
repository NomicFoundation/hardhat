import type {
  GlobalOptionDefinitions,
  GlobalOptions,
} from "../../types/global-options.js";
import type { HardhatRuntimeEnvironment } from "../../types/hre.js";
import type { Task, TaskArguments } from "../../types/tasks.js";

import { fileURLToPath } from "node:url";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { getRealPath } from "@nomicfoundation/hardhat-utils/fs";
import {
  findClosestPackageJson,
  findDependencyPackageJson,
  readClosestPackageJson,
} from "@nomicfoundation/hardhat-utils/package";
import { kebabToCamelCase } from "@nomicfoundation/hardhat-utils/string";
import debug from "debug";
import { register } from "tsx/esm/api";

import {
  ArgumentType,
  type OptionDefinition,
  type PositionalArgumentDefinition,
} from "../../types/arguments.js";
import { BUILTIN_GLOBAL_OPTIONS_DEFINITIONS } from "../builtin-global-options.js";
import { builtinPlugins } from "../builtin-plugins/index.js";
import {
  importUserConfig,
  resolveHardhatConfigPath,
} from "../config-loading.js";
import { parseArgumentValue } from "../core/arguments.js";
import { buildGlobalOptionDefinitions } from "../core/global-options.js";
import { resolveProjectRoot } from "../core/hre.js";
import { resolvePluginList } from "../core/plugins/resolve-plugin-list.js";
import { setGlobalHardhatRuntimeEnvironment } from "../global-hre-instance.js";
import { createHardhatRuntimeEnvironment } from "../hre-initialization.js";

import { printErrorMessages } from "./error-handler.js";
import { getGlobalHelpString } from "./help/get-global-help-string.js";
import { getHelpString } from "./help/get-help-string.js";
import { sendTaskAnalytics } from "./telemetry/analytics/analytics.js";
import {
  sendErrorTelemetry,
  setCliHardhatConfigPath,
  setupErrorTelemetryIfEnabled,
} from "./telemetry/sentry/reporter.js";
import { printVersionMessage } from "./version.js";

export interface MainOptions {
  print?: (message: string) => void;
  registerTsx?: boolean;
  rethrowErrors?: true;
  allowNonlocalHardhatInstallation?: true;
}

export async function main(
  rawArguments: string[],
  options: MainOptions = {},
): Promise<void> {
  await setupErrorTelemetryIfEnabled();
  const print = options.print ?? console.log;

  const log = debug("hardhat:core:cli:main");

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
      const { initHardhat } = await import("./init/init.js");
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

    // This must be the first time we set it, otherwise we let it crash
    setGlobalHardhatRuntimeEnvironment(hre);

    const taskOrId = parseTask(cliArguments, usedCliArguments, hre);

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

    await Promise.all([task.run(taskArguments), sendTaskAnalytics(task.id)]);
  } catch (error) {
    ensureError(error);
    printErrorMessages(error, builtinGlobalOptions?.showStackTraces);

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

export async function parseBuiltinGlobalOptions(
  cliArguments: string[],
  usedCliArguments: boolean[],
): Promise<{
  init: boolean;
  configPath: string | undefined;
  showStackTraces: boolean;
  help: boolean;
  version: boolean;
}> {
  let configPath: string | undefined;
  let showStackTraces: boolean = isCi();
  let help: boolean = false;
  let version: boolean = false;
  let init: boolean = false;

  // TODO: Use parseGlobalOptions(BUILTIN_GLOBAL_OPTIONS_DEFINITIONS, ...) instead
  for (let i = 0; i < cliArguments.length; i++) {
    const arg = cliArguments[i];

    if (arg === "--init") {
      usedCliArguments[i] = true;
      init = true;
      continue;
    }

    if (arg === "--config") {
      usedCliArguments[i] = true;

      if (configPath !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
          {
            name: "--config",
          },
        );
      }

      if (
        usedCliArguments[i + 1] === undefined ||
        usedCliArguments[i + 1] === true
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_CONFIG_FILE,
        );
      }

      configPath = cliArguments[i + 1];
      i++;

      usedCliArguments[i] = true;
      continue;
    }

    if (arg === "--show-stack-traces") {
      usedCliArguments[i] = true;
      showStackTraces = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      usedCliArguments[i] = true;
      help = true;
      continue;
    }

    if (arg === "--version") {
      usedCliArguments[i] = true;
      version = true;
      continue;
    }
  }

  if (init && configPath !== undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_COMBINE_INIT_AND_CONFIG_PATH,
    );
  }

  return { init, configPath, showStackTraces, help, version };
}

export async function parseGlobalOptions(
  globalOptionDefinitions: GlobalOptionDefinitions,
  cliArguments: string[],
  usedCliArguments: boolean[],
): Promise<Partial<GlobalOptions>> {
  const globalOptions: Partial<GlobalOptions> = {};

  const optionDefinitions = new Map(
    [...globalOptionDefinitions].map(([key, value]) => [key, value.option]),
  );

  parseOptions(
    cliArguments,
    usedCliArguments,
    optionDefinitions,
    globalOptions,
    true,
  );

  return globalOptions;
}

/**
 * Parses the task from the cli args.
 *
 * @returns The task, or an array with the unrecognized task id.
 * If no task id is provided, an empty array is returned.
 */
export function parseTask(
  cliArguments: string[],
  usedCliArguments: boolean[],
  hre: HardhatRuntimeEnvironment,
): Task | string[] {
  const taskOrId = getTaskFromCliArguments(cliArguments, usedCliArguments, hre);

  return taskOrId;
}

function getTaskFromCliArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  hre: HardhatRuntimeEnvironment,
): string[] | Task {
  const taskId = [];
  let task: Task | undefined;

  for (let i = 0; i < cliArguments.length; i++) {
    if (usedCliArguments[i]) {
      continue;
    }

    const arg = cliArguments[i];

    if (arg.startsWith("-")) {
      /* A standalone '--' is ok because it is used to separate CLI tool arguments
       * from task arguments, ensuring the tool passes subsequent options directly
       * to the task. Everything after "--" should be considered as a positional
       * argument. */
      if (arg === "--" || task !== undefined) {
        break;
      }

      /* At this point in the code, the global options have already been parsed, so
       * the remaining options starting with '--' are task options. Hence, if no task
       * is defined, it means that the option is not assigned to any task, and it's
       * an error. */
      throw new HardhatError(
        HardhatError.ERRORS.CORE.ARGUMENTS.UNRECOGNIZED_OPTION,
        {
          option: arg,
        },
      );
    }

    if (task === undefined) {
      try {
        task = hre.tasks.getTask(arg);
      } catch (_error) {
        return [arg]; // No task found
      }
    } else {
      const subtask = task.subtasks.get(arg);

      if (subtask === undefined) {
        break;
      }

      task = subtask;
    }

    usedCliArguments[i] = true;
    taskId.push(arg);
  }

  if (task === undefined) {
    return taskId;
  }

  return task;
}

export function parseTaskArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
): TaskArguments {
  const taskArguments: TaskArguments = {};

  // Parse options
  parseOptions(cliArguments, usedCliArguments, task.options, taskArguments);

  parsePositionalAndVariadicArguments(
    cliArguments,
    usedCliArguments,
    task,
    taskArguments,
  );

  const unusedIndex = usedCliArguments.indexOf(false);

  if (unusedIndex !== -1) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.UNUSED_ARGUMENT, {
      value: cliArguments[unusedIndex],
    });
  }

  return taskArguments;
}

/**
 * Parses the raw arguments from the command line, returning an array of
 * arguments. If an argument starts with "--" and contains "=" (i.e. "--option=123")
 * it is split into two separate arguments: the option name and the option value.
 */
export function parseRawArguments(rawArguments: string[]): string[] {
  return rawArguments.flatMap((arg) => {
    if (arg.startsWith("--") && arg.includes("=")) {
      const index = arg.indexOf("=");
      const optionName = arg.substring(0, index);
      const optionValue = arg.substring(index + 1);

      return [optionName, optionValue];
    }

    return arg;
  });
}

function parseOptions(
  cliArguments: string[],
  usedCliArguments: boolean[],
  optionDefinitions: Map<string, OptionDefinition>,
  providedArguments: TaskArguments,
  ignoreUnknownOption = false,
) {
  const optionDefinitionsByShortName = new Map<string, OptionDefinition>();
  for (const optionDefinition of optionDefinitions.values()) {
    if (optionDefinition.shortName !== undefined) {
      optionDefinitionsByShortName.set(
        optionDefinition.shortName,
        optionDefinition,
      );
    }
  }

  for (let i = 0; i < cliArguments.length; i++) {
    if (usedCliArguments[i]) {
      continue;
    }

    if (cliArguments[i] === "--") {
      /* A standalone '--' is ok because it is used to separate CLI tool arguments
       * from task arguments, ensuring the tool passes subsequent options directly
       * to the task. Everything after "--" should be considered as a positional
       * argument. */
      break;
    }

    const arg = cliArguments[i];

    let optionDefinition: OptionDefinition | undefined;

    const providedByName = arg.startsWith("--");
    const providedByShortName = !providedByName && arg.startsWith("-");

    if (providedByName) {
      const name = kebabToCamelCase(arg.substring(2));
      optionDefinition = optionDefinitions.get(name);
    } else if (providedByShortName) {
      const shortName = arg[1];

      // Check if the short name is valid
      if (Array.from(arg.substring(1)).some((c) => c !== shortName)) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_GROUP_OPTIONS,
          {
            option: arg,
          },
        );
      }

      optionDefinition = optionDefinitionsByShortName.get(shortName);
    } else {
      continue;
    }

    if (optionDefinition === undefined) {
      if (ignoreUnknownOption === true) {
        continue;
      }

      // Only throw an error when the argument is not a global option, because
      // it might be a option related to a task
      throw new HardhatError(
        HardhatError.ERRORS.CORE.ARGUMENTS.UNRECOGNIZED_OPTION,
        {
          option: arg,
        },
      );
    }

    const optionName = optionDefinition.name;

    // Check if the short name is valid again now that we know its type
    // E.g. --flag --flag
    const optionAlreadyProvided = providedArguments[optionName] !== undefined;
    // E.g. -ff
    const shortOptionGroupedAndRepeated = providedByShortName && arg.length > 2;
    const isLevelOption = optionDefinition.type === ArgumentType.LEVEL;
    if (
      optionAlreadyProvided ||
      (shortOptionGroupedAndRepeated && !isLevelOption)
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.ARGUMENTS.CANNOT_REPEAT_OPTIONS,
        {
          option: arg,
          type: optionDefinition.type,
        },
      );
    }

    usedCliArguments[i] = true;

    if (optionDefinition.type === ArgumentType.FLAG) {
      providedArguments[optionName] = true;
      continue;
    } else if (
      optionDefinition.type === ArgumentType.LEVEL &&
      providedByShortName
    ) {
      providedArguments[optionName] = arg.length - 1;
      continue;
    } else if (
      usedCliArguments[i + 1] !== undefined &&
      usedCliArguments[i + 1] === false
    ) {
      i++;

      providedArguments[optionName] = parseArgumentValue(
        cliArguments[i],
        optionDefinition.type,
        optionName,
      );

      usedCliArguments[i] = true;

      continue;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
      {
        argument: arg,
      },
    );
  }
}

function parsePositionalAndVariadicArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
  providedArguments: TaskArguments,
) {
  let argIndex = 0;

  for (let i = 0; i < cliArguments.length; i++) {
    if (usedCliArguments[i] === true) {
      continue;
    }

    if (cliArguments[i] === "--") {
      /* A standalone '--' is ok because it is used to separate CLI tool arguments
       * from task arguments, ensuring the tool passes subsequent options directly
       * to the task. Everything after "--" should be considered as a positional
       * argument. */
      usedCliArguments[i] = true;
      continue;
    }

    const argumentDefinition = task.positionalArguments[argIndex];

    if (argumentDefinition === undefined) {
      break;
    }

    usedCliArguments[i] = true;

    const formattedValue = parseArgumentValue(
      cliArguments[i],
      argumentDefinition.type,
      argumentDefinition.name,
    );

    if (argumentDefinition.isVariadic === false) {
      providedArguments[argumentDefinition.name] = formattedValue;
      argIndex++;
      continue;
    }

    // Handle variadic arguments. No longer increment "argIndex" because there can
    // only be one variadic argument, and it will consume all remaining arguments.
    providedArguments[argumentDefinition.name] =
      providedArguments[argumentDefinition.name] ?? [];
    const variadicTaskArg = providedArguments[argumentDefinition.name];
    assertHardhatInvariant(
      Array.isArray(variadicTaskArg),
      "Variadic argument values should be an array",
    );
    variadicTaskArg.push(formattedValue);
  }

  // Check if all the required arguments have been used
  validateRequiredArguments(task.positionalArguments, providedArguments);
}

function validateRequiredArguments(
  argumentDefinitions: PositionalArgumentDefinition[],
  taskArguments: TaskArguments,
) {
  const missingRequiredArgument = argumentDefinitions.find(
    ({ defaultValue, name }) =>
      defaultValue === undefined && taskArguments[name] === undefined,
  );

  if (missingRequiredArgument === undefined) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
    { argument: missingRequiredArgument.name },
  );
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

/**
 * Returns true if Hardhat is installed locally or linked from its repository,
 * by looking for it using the node module resolution logic.
 *
 * If a config file is provided, we start looking for it from there. Otherwise,
 * we use the current working directory.
 */
async function isHardhatInstalledLocallyOrLinked(
  configPath: string,
  log: debug.Debugger,
) {
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
