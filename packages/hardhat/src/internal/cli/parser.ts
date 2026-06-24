import type {
  GlobalOptionDefinitions,
  GlobalOptions,
} from "../../types/global-options.js";
import type { Task, TaskArguments } from "../../types/tasks.js";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import { kebabToCamelCase } from "@nomicfoundation/hardhat-utils/string";

import {
  ArgumentType,
  type OptionDefinition,
  type PositionalArgumentDefinition,
} from "../../types/arguments.js";
import { parseArgumentValue } from "../core/arguments.js";
import { isArgumentRequired } from "../core/tasks/utils.js";

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
  tasksMap: Map<string, Task>,
): Task | string[] {
  const taskOrId = getTaskFromCliArguments(
    cliArguments,
    usedCliArguments,
    tasksMap,
  );

  return taskOrId;
}

function getTaskFromCliArguments(
  cliArguments: string[],
  usedCliArguments: boolean[],
  tasksMap: Map<string, Task>,
): string[] | Task {
  const taskId: string[] = [];
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
      task = tasksMap.get(arg);

      if (task === undefined) {
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

    if (optionDefinition.hidden === true) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.ARGUMENTS.NO_HIDDEN_OPTION_CLI,
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
    ({ defaultValue, name, type }) =>
      isArgumentRequired(type, defaultValue) &&
      taskArguments[name] === undefined,
  );

  if (missingRequiredArgument === undefined) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.CORE.ARGUMENTS.MISSING_VALUE_FOR_ARGUMENT,
    { argument: missingRequiredArgument.name },
  );
}
