import {
  buildGlobalParameterMap,
  resolvePluginList,
} from "@nomicfoundation/hardhat-core";
import { ParameterType } from "@nomicfoundation/hardhat-core/types/common";
import {
  GlobalArguments,
  GlobalParameterMap,
} from "@nomicfoundation/hardhat-core/types/global-parameters";
import { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";
import {
  NamedTaskParameter,
  PositionalTaskParameter,
  Task,
} from "@nomicfoundation/hardhat-core/types/tasks";
import "tsx"; // NOTE: This is important, it allows us to load .ts files form the CLI
import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { builtinPlugins } from "../builtin-plugins/index.js";
import {
  importUserConfig,
  resolveConfigPath,
} from "../helpers/config-loading.js";
import { getHardhatRuntimeEnvironmentSingleton } from "../hre-singleton.js";
import { isDirectory } from "@nomicfoundation/hardhat-utils/fs";
import path from "node:path";

export async function main(cliArguments: string[]) {
  const hreInitStart = performance.now();
  let configPath: string | undefined;
  let showStackTraces: boolean = false; // true if ci
  let help: boolean = false;
  let version: boolean = false;

  const usedCliArguments = new Array(cliArguments.length).fill(false);

  for (let i = 0; i < cliArguments.length; i++) {
    const arg = cliArguments[i];

    if (arg === "--config") {
      usedCliArguments[i] = true;

      if (configPath !== undefined) {
        throw new Error("Multiple --config arguments are not allowed");
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

  if (version) {
    console.log("3.0.0");
    return;
  }

  if (configPath === undefined) {
    configPath = await resolveConfigPath();
  }

  try {
    const userConfig = await importUserConfig(configPath);

    const plugins = [...builtinPlugins, ...(userConfig.plugins ?? [])];
    const resolvedPlugins = await resolvePluginList(plugins, configPath);

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

    const result = await parseTaskAndArguments(
      cliArguments,
      usedCliArguments,
      hre,
    );

    if (Array.isArray(result)) {
      if (result.length === 0) {
        // TODO: Print the global help
        console.log("Global help");
        return;
      }

      throw new Error(`Unrecognized task ${result.join(" ")}`);
    }

    const { task, taskArguments } = result;

    if (help) {
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

    if (showStackTraces) {
      console.log("");
      console.error(error);
    }
  }
}

function parseGlobalArguments(
  _globalParamsIndex: GlobalParameterMap,
  _cliArguments: string[],
  _usedCliArguments: boolean[],
): Partial<GlobalArguments> {
  // TODO: Parse the global arguments
  // - Parse the global params, skipping the processed entries
  // - At each stage validate the value according to its type
  // - If a global param is boolean and its default is false, its value is not
  //   necessary. That means that if the immediatly next value is `"true"` or
  //   `"false"`, we should use it, but if it's not we just don't, and consider
  //   its value `true`.
  // - Mark all the used entries in usedCliArguments
  // - Do not resolve defaults here, the HRE does that.
  // - Return the values
  return {};
}

/**
 * Parses the task id and its arguments.
 *
 * @returns The task and its arguments, or an array with the unrecognized task
 *  id. If no task id is provided, an empty array is returned.
 */
export async function parseTaskAndArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  hre: HardhatRuntimeEnvironment,
): Promise<
  | {
      task: Task;
      taskArguments: Record<string, any>;
    }
  | string[]
> {
  const taskOrId = getTaskFromCliArguments(cliArguments, usedCliArguments, hre);
  if (Array.isArray(taskOrId)) {
    return taskOrId;
  }

  const task = taskOrId;

  const taskArguments = await parseTaskArguments(
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
      task = hre.tasks.getTask(arg);
      if (task === undefined) {
        return [arg];
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

async function parseTaskArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
): Promise<Record<string, any>> {
  const taskArguments: Record<string, unknown> = {};

  await parseNamedParameters(
    cliArguments,
    usedCliArguments,
    task,
    taskArguments,
  );

  await parsePositionalAndVariadicParameters(
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

async function parseNamedParameters(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
  taskArguments: Record<string, any>,
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
    const paramInfo = task.namedParameters.get(paramName);

    if (paramInfo === undefined) {
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
        taskArguments[paramName] = await parseParameterValue(
          cliArguments[i + 1],
          ParameterType.BOOLEAN,
          paramName,
        );

        usedCliArguments[i + 1] = true;
        continue;
      }

      if (paramInfo.defaultValue === false) {
        // If the default value for the parameter is false, the parameter behaves like a flag, so there is no need to specify the value
        taskArguments[paramName] = true;
        continue;
      }
    } else if (
      usedCliArguments[i + 1] !== undefined &&
      usedCliArguments[i + 1] === false
    ) {
      i++;

      taskArguments[paramName] = await parseParameterValue(
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
  validateRequiredParameters(
    Array.from(task.namedParameters.values()),
    taskArguments,
  );
}

async function parsePositionalAndVariadicParameters(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
  taskArguments: Record<string, any>,
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

    const formattedValue = await parseParameterValue(
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
    taskArguments[paramInfo.name].push(formattedValue);
  }

  // Check if all the required parameters have been used
  validateRequiredParameters(task.positionalParameters, taskArguments);
}

function validateRequiredParameters(
  parameters: PositionalTaskParameter[] | NamedTaskParameter[],
  taskArguments: Record<string, any>,
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

function kebabToCamelCase(str: string) {
  return str.replace(/-./g, (match) => match.charAt(1).toUpperCase());
}

async function parseParameterValue(
  strValue: string,
  type: ParameterType,
  argName: string,
): Promise<any> {
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

async function validateAndParseFile(
  argName: string,
  strValue: string,
): Promise<string> {
  try {
    const absolutePath = path.join(process.cwd(), strValue);

    if (await isDirectory(absolutePath)) {
      // This is caught and encapsulated in a hardhat error
      throw new Error(`${strValue} is a directory, not a file`);
    }

    return absolutePath;
  } catch (error) {
    if (error instanceof Error) {
      throw new HardhatError(
        HardhatError.ERRORS.ARGUMENTS.INVALID_INPUT_FILE,
        {
          name: argName,
          value: strValue,
        },
        error,
      );
    }

    throw error;
  }
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
