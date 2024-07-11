import type {
  OptionDefinition,
  PositionalArgumentDefinition,
} from "@ignored/hardhat-vnext-core/types/arguments";
import type {
  GlobalOptions,
  GlobalOptionDefinitions,
} from "@ignored/hardhat-vnext-core/types/global-options";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext-core/types/hre";
import type {
  Task,
  TaskArguments,
} from "@ignored/hardhat-vnext-core/types/tasks";

import "tsx"; // NOTE: This is important, it allows us to load .ts files form the CLI

import {
  buildGlobalOptionDefinitions,
  parseArgumentValue,
  resolvePluginList,
} from "@ignored/hardhat-vnext-core";
import { ArgumentType } from "@ignored/hardhat-vnext-core/types/arguments";
import {
  HardhatError,
  assertHardhatInvariant,
} from "@ignored/hardhat-vnext-errors";
import { isCi } from "@ignored/hardhat-vnext-utils/ci";
import { kebabToCamelCase } from "@ignored/hardhat-vnext-utils/string";

import { resolveHardhatConfigPath } from "../../config.js";
import { createHardhatRuntimeEnvironment } from "../../hre.js";
import { BUILTIN_GLOBAL_OPTIONS_DEFINITIONS } from "../builtin-global-options.js";
import { builtinPlugins } from "../builtin-plugins/index.js";
import { setGlobalHardhatRuntimeEnvironment } from "../global-hre-instance.js";
import { importUserConfig } from "../helpers/config-loading.js";

import { printErrorMessages } from "./error-handler.js";
import { getGlobalHelpString } from "./helpers/getGlobalHelpString.js";
import { getHelpString } from "./helpers/getHelpString.js";
import { initHardhat } from "./init/init.js";
import { getTelemetryConsent } from "./telemetry/telemetry-consent.js";
import { printVersionMessage } from "./version.js";

export async function main(
  cliArguments: string[],
  print: (message: string) => void = console.log,
): Promise<void> {
  let builtinGlobalOptions;

  try {
    const usedCliArguments: boolean[] = new Array(cliArguments.length).fill(
      false,
    );

    builtinGlobalOptions = await parseBuiltinGlobalOptions(
      cliArguments,
      usedCliArguments,
    );

    if (builtinGlobalOptions.version) {
      return await printVersionMessage(print);
    }

    if (builtinGlobalOptions.init) {
      return await initHardhat();
    }

    // TODO: the consent will be enabled in the other PRs related to telemetry
    const _telemetryConsent = await getTelemetryConsent();

    if (builtinGlobalOptions.configPath === undefined) {
      builtinGlobalOptions.configPath = await resolveHardhatConfigPath();
    }

    const userConfig = await importUserConfig(builtinGlobalOptions.configPath);

    const configPlugins = Array.isArray(userConfig.plugins)
      ? userConfig.plugins
      : [];
    const plugins = [...builtinPlugins, ...configPlugins];
    const resolvedPlugins = await resolvePluginList(
      plugins,
      builtinGlobalOptions.configPath,
    );

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

    const hre = await createHardhatRuntimeEnvironment(
      userConfig,
      { ...builtinGlobalOptions, ...userProvidedGlobalOptions },
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
        HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND,
        { task: taskOrId.join(" ") },
      );
    }

    const task = taskOrId;

    if (builtinGlobalOptions.help) {
      const taskHelp = await getHelpString(task);

      print(taskHelp);
      return;
    }

    const taskArguments = parseTaskArguments(
      cliArguments,
      usedCliArguments,
      task,
    );

    await task.run(taskArguments);
  } catch (error) {
    printErrorMessages(error, builtinGlobalOptions?.showStackTraces);
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
        throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
          name: "--config",
        });
      }

      if (
        usedCliArguments[i + 1] === undefined ||
        usedCliArguments[i + 1] === true
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.ARGUMENTS.MISSING_CONFIG_FILE,
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

    if (arg === "--help") {
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
      HardhatError.ERRORS.ARGUMENTS.CANNOT_COMBINE_INIT_AND_CONFIG_PATH,
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

    if (arg.startsWith("--")) {
      /* A standalone '--' is ok because it is used to separate CLI tool arguments
       * from task arguments, ensuring the tool passes subsequent options directly
       * to the task. Everything after "--" should be considered as a positional
       * argument. */
      if (arg.length === 2 || task !== undefined) {
        break;
      }

      /* At this point in the code, the global options have already been parsed, so
       * the remaining options starting with '--' are task options. Hence, if no task
       * is defined, it means that the option is not assigned to any task, and it's
       * an error. */
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_OPTION,
        {
          option: arg,
        },
      );
    }

    if (task === undefined) {
      try {
        task = hre.tasks.getTask(arg);
      } catch (error) {
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
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.UNUSED_ARGUMENT, {
      value: cliArguments[unusedIndex],
    });
  }

  return taskArguments;
}

function parseOptions(
  cliArguments: string[],
  usedCliArguments: boolean[],
  optionDefinitions: Map<string, OptionDefinition>,
  providedArguments: TaskArguments,
  ignoreUnknownOption = false,
) {
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

    if (arg.startsWith("--") === false) {
      continue;
    }

    const optionName = kebabToCamelCase(arg.substring(2));
    const optionDefinition = optionDefinitions.get(optionName);

    if (optionDefinition === undefined) {
      if (ignoreUnknownOption === true) {
        continue;
      }

      // Only throw an error when the argument is not a global option, because
      // it might be a option related to a task
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_OPTION,
        {
          option: arg,
        },
      );
    }

    usedCliArguments[i] = true;

    if (optionDefinition.type === ArgumentType.BOOLEAN) {
      if (
        usedCliArguments[i + 1] !== undefined &&
        usedCliArguments[i + 1] === false &&
        (cliArguments[i + 1] === "true" || cliArguments[i + 1] === "false")
      ) {
        // The argument could be followed by a boolean value if it does not
        // behaves like a flag
        providedArguments[optionName] = parseArgumentValue(
          cliArguments[i + 1],
          ArgumentType.BOOLEAN,
          optionName,
        );

        usedCliArguments[i + 1] = true;
        continue;
      }

      if (optionDefinition.defaultValue === false) {
        // If the default value for the argument is false, the argument behaves
        // like a flag, so there is no need to specify the value
        providedArguments[optionName] = true;
        continue;
      }
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
      HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
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
    HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
    { argument: missingRequiredArgument.name },
  );
}
