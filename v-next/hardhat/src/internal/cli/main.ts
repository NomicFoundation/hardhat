import type { ParameterValue } from "@nomicfoundation/hardhat-core/types/common";
import type {
  GlobalArguments,
  GlobalParameter,
  GlobalParameterMap,
} from "@nomicfoundation/hardhat-core/types/global-parameters";
import type { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";
import type {
  NamedTaskParameter,
  Task,
  TaskArguments,
  TaskParameter,
} from "@nomicfoundation/hardhat-core/types/tasks";

import "tsx"; // NOTE: This is important, it allows us to load .ts files form the CLI

import {
  buildGlobalParameterMap,
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

export async function main(cliArguments: string[]) {
  const hreInitStart = performance.now();

  const usedCliArguments: boolean[] = new Array(cliArguments.length).fill(
    false,
  );

  const hardhatSpecialArgs = await parseHardhatSpecialArguments(
    cliArguments,
    usedCliArguments,
  );

  if (hardhatSpecialArgs.version) {
    console.log("3.0.0");
    return;
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

    const globalParameterMap = buildGlobalParameterMap(resolvedPlugins);
    const userProvidedGlobalArguments = parseGlobalArguments(
      globalParameterMap,
      cliArguments,
      usedCliArguments,
    );

    const hre = await getHardhatRuntimeEnvironmentSingleton(
      userConfig,
      userProvidedGlobalArguments,
      {
        resolvedPlugins,
        globalParameterMap,
      },
    );

    const hreInitEnd = performance.now();
    console.log("Time to initialize the HRE (ms):", hreInitEnd - hreInitStart);

    const taskParsingStart = performance.now();

    const result = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

    if (Array.isArray(result)) {
      if (result.length === 0) {
        // TODO: Print the global help
        console.log("Global help");
        return;
      }

      throw new Error(`Unrecognized task ${result.join(" ")}`);
    }

    const { task, taskArguments } = result;

    if (hardhatSpecialArgs.help) {
      if (task.isEmpty) {
        // TODO: Print information about its subtasks
        console.log("Info about subtasks");
        return;
      }

      // TODO: Print the help message for this task
      console.log("Help message of the task");
      return;
    }

    const taskParsingEnd = performance.now();

    console.log(
      "Time to parse the task (ms):",
      taskParsingEnd - taskParsingStart,
    );

    const taskRunningStart = performance.now();

    await task.run(taskArguments);

    const taskRunningEnd = performance.now();

    console.log(
      "Time to run the task (ms):",
      taskRunningEnd - taskRunningStart,
    );
  } catch (error) {
    process.exitCode = 1;

    // TODO: Use ensureError
    if (!(error instanceof Error)) {
      throw error;
    }

    // TODO: Print the errors nicely, especially `HardhatError`s.

    console.log("Error running the task:", error.message);

    if (hardhatSpecialArgs.showStackTraces) {
      console.log("");
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

  for (let i = 0; i < cliArguments.length; i++) {
    const arg = cliArguments[i];

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

  return { configPath, showStackTraces, help, version };
}

export async function parseGlobalArguments(
  globalParamsIndex: GlobalParameterMap,
  cliArguments: string[],
  usedCliArguments: boolean[],
): Promise<Partial<GlobalArguments>> {
  const globalArguments: Partial<GlobalArguments> = {};

  const parameters = new Map(
    [...globalParamsIndex].map(([key, value]) => [key, value.param]),
  );

  parseDoubleDashArgs(
    cliArguments,
    usedCliArguments,
    parameters,
    globalArguments,
    true,
  );

  return globalArguments;
}

/**
 * Parses the task id and its arguments.
 *
 * @returns The task and its arguments, or an array with the unrecognized task
 *  id. If no task id is provided, an empty array is returned.
 */
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
  const taskOrId = getTaskFromCliArguments(cliArguments, usedCliArguments, hre);
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

      // At this point in the code, the global parameters have already been parsed, so the remaining parameters starting with '--' are task named parameters.
      // Hence, if no task is defined, it means that the parameter is not assigned to any task, and it's an error.
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_NAMED_PARAM,
        {
          parameter: arg,
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

  // Parse named parameters
  parseDoubleDashArgs(
    cliArguments,
    usedCliArguments,
    task.namedParameters,
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
  parametersMap: Map<string, NamedTaskParameter | GlobalParameter>,
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
    const paramInfo = parametersMap.get(paramName);

    if (paramInfo === undefined) {
      if (ignoreUnknownParameter === true) {
        continue;
      }

      // Only throw an error when the parameter is not a global parameter, because it might be a parameter related to a task
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.UNRECOGNIZED_NAMED_PARAM,
        {
          parameter: arg,
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
  validateRequiredParameters([...parametersMap.values()], argumentsMap);
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
