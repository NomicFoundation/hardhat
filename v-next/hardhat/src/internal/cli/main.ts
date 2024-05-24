import { isAbsolute, resolve } from "node:path";

import {
  buildGlobalParameterMap,
  resolvePluginList,
} from "@nomicfoundation/hardhat-core";
import {
  GlobalArguments,
  GlobalParameterMap,
} from "@nomicfoundation/hardhat-core/types/global-parameters";
import { HardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core/types/hre";
import { Task } from "@nomicfoundation/hardhat-core/types/tasks";

import "tsx"; // NOTE: This is important, it allows us to load .ts files form the CLI
import { builtinPlugins } from "../builtin-plugins/index.js";
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
    // TODO: Find the closest config file
    // if HARDHAT_CONFIG exists, use it
    throw new Error("Missing --config");
  }

  try {
    const userConfig = await importUserConfig(configPath);

    const plugins = [...builtinPlugins, ...(userConfig.plugins ?? [])];
    const resolvedPlugins = resolvePluginList(plugins);

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
function parseTaskAndArguments(
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

  // TODO: Parse the task arguments
  // - Skip the used cli arguments.
  // - Everything after `--` is a positional argument.
  // - Most name parameters are parsed as `--name value`
  // - Name parameters of boolean type with default `false` can be used as
  //    `--name` and their value is not necessary (it's implicitly `true`).
  // - Positional parameters are parsed as `<value>`, one at the time.
  // - Variadic positional parameters are parsed as `<value>...` and consume
  //   all the remaining values.
  // - Parse each argument value according to its type
  // - Fail if there are unrecognized or unused cli arguments.
  // - Note: missing and optional parameters should be handled in Task#run

  return { task, taskArguments: {} };
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
      if (arg.length === 2 || task !== undefined) {
        break;
      }

      throw new Error(`Found task argument ${arg} before the task name`);
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

async function importUserConfig(configPath: string) {
  const normalizedPath = isAbsolute(configPath)
    ? configPath
    : resolve(process.cwd(), configPath);

  const { exists } = await import("@nomicfoundation/hardhat-utils/fs");

  if (!(await exists(normalizedPath))) {
    throw new Error(`Config file ${configPath} not found`);
  }

  const imported = await import(normalizedPath);

  if (!("default" in imported)) {
    throw new Error(`No config exported in ${configPath}`);
  }

  const config = imported.default;

  if (typeof config !== "object" || config === null) {
    throw new Error(`Invalid config exported in ${configPath}`);
  }

  return config;
}
