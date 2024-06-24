import type { ParameterValue } from "@nomicfoundation/hardhat-core/types/common";
import type {
  GlobalOptions,
  GlobalOption,
  GlobalOptionsMap,
} from "@nomicfoundation/hardhat-core/types/global-options";
import type { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";
import type {
  TaskOption,
  Task,
  TaskArguments,
  TaskParameter,
} from "@nomicfoundation/hardhat-core/types/tasks";

import "tsx"; // NOTE: This is important, it allows us to load .ts files form the CLI

import {
  buildGlobalOptionsMap,
  resolvePluginList,
} from "@nomicfoundation/hardhat-core";
import { ParameterType } from "@nomicfoundation/hardhat-core/types/common";
import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import { kebabToCamelCase } from "@nomicfoundation/hardhat-utils/string";

import { builtinPlugins } from "../builtin-plugins/index.js";
import {
  importUserConfig,
  resolveConfigPath,
} from "../helpers/config-loading.js";
import { getHardhatRuntimeEnvironmentSingleton } from "../hre-singleton.js";

import { getGlobalHelpString } from "./helpers/getGlobalHelpString.js";
import { getHelpString } from "./helpers/getHelpString.js";
import { initHardhat } from "./init/init.js";
import { printVersionMessage } from "./version.js";

export async function main(cliArguments: string[], print = console.log) {
  const hreInitStart = performance.now();

  const usedCliArguments: boolean[] = new Array(cliArguments.length).fill(
    false,
  );

  const hardhatSpecialArgs = await parseHardhatSpecialArguments(
    cliArguments,
    usedCliArguments,
  );

  if (hardhatSpecialArgs.version) {
    return printVersionMessage(print);
  }

  if (hardhatSpecialArgs.init) {
    return initHardhat();
  }

  if (hardhatSpecialArgs.configPath === undefined) {
    hardhatSpecialArgs.configPath = await resolveConfigPath();
  }

  try {
    const userConfig = await importUserConfig(hardhatSpecialArgs.configPath);

    const configPlugins = Array.isArray(userConfig.plugins)
      ? userConfig.plugins
      : [];
    const plugins = [...builtinPlugins, ...configPlugins];
    const resolvedPlugins = await resolvePluginList(
      plugins,
      hardhatSpecialArgs.configPath,
    );

    const globalOptionsMap = buildGlobalOptionsMap(resolvedPlugins);
    const userProvidedGlobalOptions = parseGlobalOptions(
      globalOptionsMap,
      cliArguments,
      usedCliArguments,
    );

    const hre = await getHardhatRuntimeEnvironmentSingleton(
      userConfig,
      userProvidedGlobalOptions,
      {
        resolvedPlugins,
        globalOptionsMap,
      },
    );

    const hreInitEnd = performance.now();
    print("Time to initialize the HRE (ms):", hreInitEnd - hreInitStart);

    const taskParsingStart = performance.now();

    const taskOrId = parseTask(cliArguments, usedCliArguments, hre);

    if (Array.isArray(taskOrId)) {
      if (taskOrId.length === 0) {
        const globalHelp = await getGlobalHelpString(hre.tasks.rootTasks);

        print(globalHelp);
        return;
      }

      throw new HardhatError(
        HardhatError.ERRORS.TASK_DEFINITIONS.TASK_NOT_FOUND,
        { task: taskOrId.join(" ") },
      );
    }

    const task = taskOrId;

    if (hardhatSpecialArgs.help) {
      const taskHelp = await getHelpString(task);

      print(taskHelp);
      return;
    }

    const taskArguments = parseTaskArguments(
      cliArguments,
      usedCliArguments,
      task,
    );

    const taskParsingEnd = performance.now();

    print("Time to parse the task (ms):", taskParsingEnd - taskParsingStart);

    const taskRunningStart = performance.now();

    await task.run(taskArguments);

    const taskRunningEnd = performance.now();

    print("Time to run the task (ms):", taskRunningEnd - taskRunningStart);
  } catch (error) {
    process.exitCode = 1;

    // TODO: Use ensureError
    if (!(error instanceof Error)) {
      throw error;
    }

    // TODO: Print the errors nicely, especially `HardhatError`s.

    print("Error running the task:", error.message);

    if (hardhatSpecialArgs.showStackTraces) {
      print("");
      console.error(error);
    }
  }
}

export async function parseHardhatSpecialArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
) {
  let configPath: string | undefined;
  let showStackTraces: boolean = isCi();
  let help: boolean = false;
  let version: boolean = false;
  let init: boolean = false;

  for (let i = 0; i < cliArguments.length; i++) {
    const arg = cliArguments[i];

    if (arg === "init") {
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
  globalOptionsMap: GlobalOptionsMap,
  cliArguments: string[],
  usedCliArguments: boolean[],
): Promise<Partial<GlobalOptions>> {
  const globalOptions: Partial<GlobalOptions> = {};

  const options = new Map(
    [...globalOptionsMap].map(([key, value]) => [key, value.option]),
  );

  parseDoubleDashArgs(
    cliArguments,
    usedCliArguments,
    options,
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

/**
 * Parses the task id and its arguments.
 *
 * @returns The task and its arguments, or an array with the unrecognized task
 *  id. If no task id is provided, an empty array is returned.
 */
// todo: this function isn't used anymore and needs to be removed
export function parseTaskAndArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  hre: HardhatRuntimeEnvironment,
):
  | {
      task: Task;
      taskArguments: TaskArguments;
    }
  | string[] {
  const taskOrId = parseTask(cliArguments, usedCliArguments, hre);
  if (Array.isArray(taskOrId)) {
    return taskOrId;
  }

  const task = taskOrId;

  const taskArguments = parseTaskArguments(
    cliArguments,
    usedCliArguments,
    task,
  );

  return { task, taskArguments };
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
      // A standalone '--' is ok because it is used to separate CLI tool arguments from task arguments, ensuring the tool passes
      // subsequent options directly to the task. Everything after "--" should be considered as a positional parameter
      if (arg.length === 2 || task !== undefined) {
        break;
      }

      // At this point in the code, the global options have already been parsed, so the remaining options starting with '--' are task options.
      // Hence, if no task is defined, it means that the option is not assigned to any task, and it's an error.
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

function parseTaskArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
): TaskArguments {
  const taskArguments: TaskArguments = {};

  // Parse options
  parseDoubleDashArgs(
    cliArguments,
    usedCliArguments,
    task.options,
    taskArguments,
  );

  parsePositionalAndVariadicParameters(
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

function parseDoubleDashArgs(
  cliArguments: string[],
  usedCliArguments: boolean[],
  optionsMap: Map<string, TaskOption | GlobalOption>,
  argumentsMap: TaskArguments,
  ignoreUnknownParameter = false,
) {
  for (let i = 0; i < cliArguments.length; i++) {
    if (usedCliArguments[i]) {
      continue;
    }

    if (cliArguments[i] === "--") {
      // A standalone '--' is ok because it is used to separate CLI tool arguments from task arguments, ensuring the tool passes
      // subsequent options directly to the task. Everything after "--" should be considered as a positional parameter
      break;
    }

    const arg = cliArguments[i];

    if (arg.startsWith("--") === false) {
      continue;
    }

    const paramName = kebabToCamelCase(arg.substring(2));
    const paramInfo = optionsMap.get(paramName);

    if (paramInfo === undefined) {
      if (ignoreUnknownParameter === true) {
        continue;
      }

      // Only throw an error when the parameter is not a global option, because it might be a option related to a task
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_OPTION,
        {
          option: arg,
        },
      );
    }

    usedCliArguments[i] = true;

    if (paramInfo.parameterType === ParameterType.BOOLEAN) {
      if (
        usedCliArguments[i + 1] !== undefined &&
        usedCliArguments[i + 1] === false &&
        (cliArguments[i + 1] === "true" || cliArguments[i + 1] === "false")
      ) {
        // The parameter could be followed by a boolean value if it does not behaves like a flag
        argumentsMap[paramName] = parseParameterValue(
          cliArguments[i + 1],
          ParameterType.BOOLEAN,
          paramName,
        );

        usedCliArguments[i + 1] = true;
        continue;
      }

      if (paramInfo.defaultValue === false) {
        // If the default value for the parameter is false, the parameter behaves like a flag, so there is no need to specify the value
        argumentsMap[paramName] = true;
        continue;
      }
    } else if (
      usedCliArguments[i + 1] !== undefined &&
      usedCliArguments[i + 1] === false
    ) {
      i++;

      argumentsMap[paramName] = parseParameterValue(
        cliArguments[i],
        paramInfo.parameterType,
        paramName,
      );

      usedCliArguments[i] = true;

      continue;
    }

    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
      {
        paramName: arg,
      },
    );
  }

  // Check if all the required parameters have been used
  validateRequiredParameters([...optionsMap.values()], argumentsMap);
}

function parsePositionalAndVariadicParameters(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
  taskArguments: TaskArguments,
) {
  let paramI = 0;

  for (let i = 0; i < cliArguments.length; i++) {
    if (usedCliArguments[i] === true) {
      continue;
    }

    if (cliArguments[i] === "--") {
      // A standalone '--' is ok because it is used to separate CLI tool arguments from task arguments, ensuring the tool passes
      // subsequent options directly to the task. Everything after "--" should be considered as a positional parameter
      usedCliArguments[i] = true;
      continue;
    }

    const paramInfo = task.positionalParameters[paramI];

    if (paramInfo === undefined) {
      break;
    }

    usedCliArguments[i] = true;

    const formattedValue = parseParameterValue(
      cliArguments[i],
      paramInfo.parameterType,
      paramInfo.name,
    );

    if (paramInfo.isVariadic === false) {
      taskArguments[paramInfo.name] = formattedValue;
      paramI++;
      continue;
    }

    // Handle variadic parameters. No longer increment "paramI" becuase there can only be one variadic parameter and it
    // will consume all remaining arguments.
    taskArguments[paramInfo.name] = taskArguments[paramInfo.name] ?? [];
    const variadicTaskArg = taskArguments[paramInfo.name];
    assertHardhatInvariant(
      Array.isArray(variadicTaskArg),
      "Variadic parameter values should be an array",
    );
    variadicTaskArg.push(formattedValue);
  }

  // Check if all the required parameters have been used
  validateRequiredParameters(task.positionalParameters, taskArguments);
}

function validateRequiredParameters(
  parameters: TaskParameter[],
  taskArguments: TaskArguments,
) {
  const missingRequiredParam = parameters.find(
    (param) =>
      param.defaultValue === undefined &&
      taskArguments[param.name] === undefined,
  );

  if (missingRequiredParam === undefined) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_PARAMETER,
    { paramName: missingRequiredParam.name },
  );
}

function parseParameterValue(
  strValue: string,
  type: ParameterType,
  argName: string,
): ParameterValue {
  switch (type) {
    case ParameterType.STRING:
      return validateAndParseString(argName, strValue);
    case ParameterType.FILE:
      return validateAndParseFile(argName, strValue);
    case ParameterType.INT:
      return validateAndParseInt(argName, strValue);
    case ParameterType.FLOAT:
      return validateAndParseFloat(argName, strValue);
    case ParameterType.BIGINT:
      return validateAndParseBigInt(argName, strValue);
    case ParameterType.BOOLEAN:
      return validateAndParseBoolean(argName, strValue);
  }
}

function validateAndParseInt(argName: string, strValue: string): number {
  const decimalPattern = /^\d+(?:[eE]\d+)?$/;
  const hexPattern = /^0[xX][\dABCDEabcde]+$/;

  if (
    strValue.match(decimalPattern) === null &&
    strValue.match(hexPattern) === null
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: strValue,
        name: argName,
        type: "int",
      },
    );
  }

  return Number(strValue);
}

function validateAndParseString(_argName: string, strValue: string): string {
  return strValue;
}

function validateAndParseFile(_argName: string, strValue: string): string {
  return strValue;
}

function validateAndParseFloat(argName: string, strValue: string): number {
  const decimalPattern = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]\d+)?$/;
  const hexPattern = /^0[xX][\dABCDEabcde]+$/;

  if (
    strValue.match(decimalPattern) === null &&
    strValue.match(hexPattern) === null
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: strValue,
        name: argName,
        type: "float",
      },
    );
  }

  return Number(strValue);
}

function validateAndParseBigInt(argName: string, strValue: string): bigint {
  const decimalPattern = /^\d+(?:n)?$/;
  const hexPattern = /^0[xX][\dABCDEabcde]+$/;

  if (
    strValue.match(decimalPattern) === null &&
    strValue.match(hexPattern) === null
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      {
        value: strValue,
        name: argName,
        type: "bigint",
      },
    );
  }

  return BigInt(strValue.replace("n", ""));
}

function validateAndParseBoolean(argName: string, strValue: string): boolean {
  if (strValue.toLowerCase() === "true") {
    return true;
  }
  if (strValue.toLowerCase() === "false") {
    return false;
  }

  throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
    value: strValue,
    name: argName,
    type: "boolean",
  });
}
