import type { GlobalOptionDefinitions } from "../../types/global-options.js";
import type {
  HardhatRuntimeEnvironment,
  Task,
  TaskDefinition,
} from "../../types/index.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { globalFlag } from "../../config.js";
import { isResult } from "../../utils/result.js";
import { generateTasks } from "../builtin-plugins/hhu/tasks/index.js";
import { TaskManagerImplementation } from "../core/tasks/task-manager.js";
import { getHardhatVersion } from "../utils/package.js";

import { printErrorMessages } from "./error-handler.js";
import { getGlobalHelpString } from "./help/get-global-help-string.js";
import { getHelpString } from "./help/get-help-string.js";
import {
  parseGlobalOptions,
  parseRawArguments,
  parseTask,
  parseTaskArguments,
} from "./parser.js";
import { sendTaskAnalytics } from "./telemetry/analytics/analytics.js";
import { setupGlobalUnhandledErrorHandlers } from "./telemetry/error-reporter/global-error-handlers.js";
import { sendErrorTelemetry } from "./telemetry/error-reporter/reporter.js";

interface MainOptions {
  print?: (message: string) => void;
  rethrowErrors?: true;
}

export async function main(
  rawArguments: string[],
  options: MainOptions = {},
): Promise<void> {
  // We set up the global unhandled errors before running any functionality
  setupGlobalUnhandledErrorHandlers();

  const print = options.print ?? console.log;

  const log = createDebug("hardhat:core:hhu:main");

  let hhuGlobalOptions;

  log("hhu started");

  try {
    const cliArguments = parseRawArguments(rawArguments);

    const usedCliArguments: boolean[] = new Array(cliArguments.length).fill(
      false,
    );

    hhuGlobalOptions = await parseHhuGlobalOptions(
      cliArguments,
      usedCliArguments,
    );

    log("Parsed hhu global options");

    if (hhuGlobalOptions.version) {
      return await printHhuVersionMessage(print);
    }

    const globalOptionDefinitions: GlobalOptionDefinitions = new Map(
      HHU_GLOBAL_OPTIONS_DEFINITIONS,
    );

    const rootTasks = taskDefinitionsToTasksMap(
      generateTasks({ withUtils: false }),
    );

    const taskOrId = parseTask(cliArguments, usedCliArguments, rootTasks);

    if (Array.isArray(taskOrId)) {
      if (taskOrId.length === 0) {
        const globalHelp = await getGlobalHelpString(
          rootTasks,
          globalOptionDefinitions,
          { command: "hhu" },
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

    if (hhuGlobalOptions.help || task.isEmpty) {
      const taskHelp = await getHelpString(task, globalOptionDefinitions, {
        command: "hhu",
      });

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
      sendTaskAnalytics(task.id),
    ]);

    if (isResult(taskResult) && !taskResult.success) {
      process.exitCode = 1;
    }
  } catch (error) {
    ensureError(error);
    await printErrorMessages(error, hhuGlobalOptions?.showStackTraces);

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

const HHU_GLOBAL_OPTIONS_DEFINITIONS: GlobalOptionDefinitions = new Map([
  [
    "help",
    {
      pluginId: "builtin",
      option: globalFlag({
        name: "help",
        shortName: "h",
        description:
          "Show this message, or a task's help if its name is provided.",
      }),
    },
  ],
  [
    "showStackTraces",
    {
      pluginId: "builtin",
      option: globalFlag({
        name: "showStackTraces",
        description: "Show stack traces (always enabled on CI servers).",
      }),
    },
  ],
  [
    "version",
    {
      pluginId: "builtin",
      option: globalFlag({
        name: "version",
        description: "Show the version of hhu.",
      }),
    },
  ],
]);

export async function parseHhuGlobalOptions(
  cliArguments: string[],
  usedCliArguments: boolean[],
): Promise<{
  help: boolean;
  showStackTraces: boolean;
  version: boolean;
}> {
  const hhuGlobalOptions = await parseGlobalOptions(
    HHU_GLOBAL_OPTIONS_DEFINITIONS,
    cliArguments,
    usedCliArguments,
  );

  return {
    help: hhuGlobalOptions.help ?? false,
    showStackTraces: hhuGlobalOptions.showStackTraces ?? false,
    version: hhuGlobalOptions.version ?? false,
  };
}

export async function printHhuVersionMessage(
  print: (message: string) => void = console.log,
): Promise<void> {
  print(await getHardhatVersion());
}

function makeStrictProxy<T extends object>(
  name: string,
  object: Partial<T>,
): T {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- unaccessible properties will throw an assertion error
  return new Proxy(object as T, {
    get(target, property) {
      assertHardhatInvariant(
        property in object,
        `Unexpected access of property "${String(property)}" in ${name}.`,
      );

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we know this is safe because of the assertion above
      return target[property as keyof T];
    },
  });
}

function taskDefinitionsToTasksMap(tasks: TaskDefinition[]): Map<string, Task> {
  // To be able to parse the hhu arguments, we need to create a tasks map from
  // the task definitions. The easiest way to do that is by using
  // `TaskManagerImplementation`, but this needs an HRE and we don't want to
  // create one just for this. So we use a fake HRE that has the minimum
  // properties needed.
  //
  // One downside of this approach is that we _won't_ get a compilation error
  // if `TaskManagerImplementation` tries to access a property that doesn't exist in the
  // fake HRE, but tests should catch that.
  const fakeHre = makeStrictProxy<HardhatRuntimeEnvironment>(
    "hhu's proxied HRE",
    {
      config: makeStrictProxy<HardhatRuntimeEnvironment["config"]>(
        "hhu's proxied config",
        {
          tasks,
          plugins: [],
        },
      ),
    },
  );

  const taskManager = new TaskManagerImplementation(fakeHre, new Map());

  return taskManager.rootTasks;
}
