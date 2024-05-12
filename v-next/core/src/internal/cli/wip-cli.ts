// This shouldn't be the main entry point. We need a previous file that loads
// tsx/esm and then imports this one.
// This should also be moved to its own package.

import { isAbsolute, resolve } from "node:path";
import {
  GlobalParameterMap,
  buildGlobalParameterMap,
  createHardhatRuntimeEnvironment,
  resolvePluginList,
} from "../../index.js";
import { GlobalArguments } from "../../types/global-parameters.js";
import { HardhatRuntimeEnvironment } from "../../types/hre.js";
import { Task } from "../../types/tasks.js";
import { HardhatPlugin } from "../../types/plugins.js";

async function main(cliArguments: string[]) {
  const hreInitStart = process.hrtime.bigint();
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
    throw new Error("Missing --config");
  }

  try {
    const userConfig = await importUserConfig(configPath);

    const resolvedPlugins: HardhatPlugin[] = resolvePluginList(
      userConfig.plugins,
    );

    const globalParameterMap = buildGlobalParameterMap(resolvedPlugins);
    const userProvidedGlobalArguments = parseGlobalArguments(
      globalParameterMap,
      cliArguments,
      usedCliArguments,
    );

    const hre = await createHardhatRuntimeEnvironment(
      userConfig,
      userProvidedGlobalArguments,
      { resolvedPlugins, globalParameterMap },
    );

    const hreInitEnd = process.hrtime.bigint();
    console.log(
      "Time to initialize the HRE (ms):",
      (hreInitEnd - hreInitStart) / 1000000n,
    );

    const taskParsingStart = process.hrtime.bigint();

    const result = parseTaskAndArguments(cliArguments, usedCliArguments, hre);

    if (result === undefined) {
      // TODO: Print the global help
      console.log("Global help");
      return;
    }

    if (Array.isArray(result)) {
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

    const taskParsingEnd = process.hrtime.bigint();

    console.log(
      "Time to parse the task (ms):",
      (taskParsingEnd - taskParsingStart) / 1000000n,
    );

    const taskRunningStart = process.hrtime.bigint();

    await task.run(taskArguments);

    const taskRunningEnd = process.hrtime.bigint();

    console.log(
      "Time to run the task (ms):",
      (taskRunningEnd - taskRunningStart) / 1000000n,
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

  let exists: boolean;

  // TODO: use hardhat-utils
  try {
    const { stat } = await import("node:fs/promises");
    await stat(normalizedPath);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
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

main(process.argv.slice(2)).catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
