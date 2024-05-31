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
import { Task } from "@nomicfoundation/hardhat-core/types/tasks";
import "tsx"; // NOTE: This is important, it allows us to load .ts files form the CLI
import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { builtinPlugins } from "../builtin-plugins/index.js";
import {
  importUserConfig,
  resolveConfigPath,
} from "../helpers/config-loading.js";
import { getHardhatRuntimeEnvironmentSingleton } from "../hre-singleton.js";

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
export function parseTaskAndArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  hre: HardhatRuntimeEnvironment,
):
  | {
      task: Task;
      taskArguments: Record<string, any>;
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

function parseTaskArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  task: Task,
): Record<string, any> {
  const taskArguments: Record<string, unknown> = {};

  parseNamedParameters(cliArguments, usedCliArguments, task, taskArguments);

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

function parseNamedParameters(
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
        usedCliArguments[i + 1] === false &&
        ["true", "false"].includes(cliArguments[i + 1])
      ) {
        // The flag could be follow by the boolean value
        taskArguments[paramName] = formatParameterValue(
          cliArguments[i + 1],
          ParameterType.BOOLEAN,
          paramName,
        );

        usedCliArguments[i + 1] = true;
        continue;
      }

      // If the flag is not followed by a boolean value, then the flag itself means that the value is true
      taskArguments[paramName] = true;
      continue;
    }

    // The value immediately following a named parameter (if the parameter does not behave as a flag)
    // is the parameter's value; otherwise, it's an error
    if (usedCliArguments[i + 1] === false) {
      i++;

      taskArguments[paramName] = formatParameterValue(
        cliArguments[i],
        paramInfo.parameterType,
        paramName,
      );

      usedCliArguments[i] = true;

      continue;
    }

    throw new HardhatError(
      HardhatError.ERRORS.ARGUMENTS.MISSING_VALUE_FOR_NAMED_PARAMETER,
      {
        paramName: arg,
      },
    );
  }
}

function parsePositionalAndVariadicParameters(
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
      continue;
    }

    usedCliArguments[i] = true;

    const formattedValue = formatParameterValue(
      cliArguments[i],
      paramInfo.parameterType,
      paramInfo.name,
    );

    if (paramInfo.isVariadic === false) {
      taskArguments[task.positionalParameters[paramI++].name] = formattedValue;
      continue;
    }

    // Handle variadic parameters
    taskArguments[paramInfo.name] = taskArguments[paramInfo.name] ?? [];
    taskArguments[paramInfo.name].push(formattedValue);
  }
}

function kebabToCamelCase(str: string) {
  return str.replace(/-./g, (match) => match.charAt(1).toUpperCase());
}

function formatParameterValue(
  value: string,
  type: ParameterType,
  name: string,
): any {
  switch (type) {
    case ParameterType.STRING:
    case ParameterType.FILE:
      return value;
    case ParameterType.INT:
    case ParameterType.FLOAT:
      return Number(value);
    case ParameterType.BIGINT:
      return BigInt(value);
    case ParameterType.BOOLEAN:
      if (value !== "true" && value !== "false") {
        throw new HardhatError(
          HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
          {
            value,
            name,
            type,
          },
        );
      }

      return value === "true";
  }
}
