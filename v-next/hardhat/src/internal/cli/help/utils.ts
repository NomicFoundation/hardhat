import type {
  ArgumentType,
  ArgumentTypeToValueType,
} from "../../../types/arguments.js";
import type { GlobalOptionDefinitions } from "../../../types/global-options.js";
import type { Task } from "../../../types/tasks.js";

import { camelToKebabCase } from "@nomicfoundation/hardhat-utils/string";

export const GLOBAL_NAME_PADDING = 6;

interface ArgumentDescriptor {
  name: string;
  shortName?: string;
  description: string;
  type?: ArgumentType;
  defaultValue?: ArgumentTypeToValueType<ArgumentType>;
  isRequired?: boolean;
}

export function parseGlobalOptions(
  globalOptionDefinitions: GlobalOptionDefinitions,
): ArgumentDescriptor[] {
  return [...globalOptionDefinitions].map(([, { option }]) => ({
    name: toCommandLineOption(option.name),
    shortName: toShortCommandLineOption(option.shortName),
    description: trimFullStop(option.description),
  }));
}

export function parseTasks(taskMap: Map<string, Task>): {
  tasks: ArgumentDescriptor[];
  subtasks: ArgumentDescriptor[];
} {
  const tasks = [];
  const subtasks = [];

  for (const [taskName, task] of taskMap) {
    subtasks.push(...parseSubtasks(task));

    if (task.isEmpty) {
      continue;
    }

    tasks.push({ name: taskName, description: trimFullStop(task.description) });
  }

  return { tasks, subtasks };
}

export function parseSubtasks(task: Task): ArgumentDescriptor[] {
  const subtasks = [];

  for (const [, subtask] of task.subtasks) {
    subtasks.push({
      name: subtask.id.join(" "),
      description: trimFullStop(subtask.description),
    });
  }

  return subtasks;
}

export function parseOptions(task: Task): {
  options: ArgumentDescriptor[];
  positionalArguments: ArgumentDescriptor[];
} {
  const options = [];
  const positionalArguments = [];

  for (const [optionName, option] of task.options) {
    options.push({
      name: toCommandLineOption(optionName),
      shortName: toShortCommandLineOption(option.shortName),
      description: trimFullStop(option.description),
      type: option.type,
      ...(option.defaultValue !== undefined && {
        defaultValue: option.defaultValue,
      }),
    });
  }

  for (const { name, description, defaultValue } of task.positionalArguments) {
    positionalArguments.push({
      name,
      description: trimFullStop(description),
      isRequired: defaultValue === undefined,
      ...(defaultValue !== undefined && {
        defaultValue: Array.isArray(defaultValue)
          ? defaultValue.join(", ")
          : defaultValue,
      }),
    });
  }

  return { options, positionalArguments };
}

export function toCommandLineOption(optionName: string): string {
  return `--${camelToKebabCase(optionName)}`;
}

export function toShortCommandLineOption(
  optionShortName?: string,
): string | undefined {
  return optionShortName !== undefined ? `-${optionShortName}` : undefined;
}

export function getLongestNameLength(
  tasks: Array<{ name: string; shortName?: string }>,
): number {
  return tasks.reduce(
    (acc, { name, shortName }) =>
      Math.max(acc, getNameString(name, shortName).length),
    0,
  );
}

export function getSection(
  title: string,
  items: ArgumentDescriptor[],
  namePadding: number,
): string {
  return `\n${title}:\n\n${items
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, shortName, description, defaultValue }) => {
      const nameStr = getNameString(name, shortName);
      const defaultValueStr = getDefaultValueString(defaultValue);
      return `  ${nameStr.padEnd(namePadding)}${description}${defaultValueStr}`.trimEnd();
    })
    .join("\n")}\n`;
}

function trimFullStop(str: string): string {
  return str.endsWith(".") ? str.slice(0, -1) : str;
}

function getNameString(name: string, shortName?: string): string {
  return shortName !== undefined ? [name, shortName].join(", ") : name;
}

function getDefaultValueString(
  defaultValue: ArgumentTypeToValueType<ArgumentType>,
): string {
  if (Array.isArray(defaultValue)) {
    if (defaultValue.length === 0) {
      return "";
    } else {
      return ` (default: ${JSON.stringify(defaultValue)})`;
    }
  }

  if (defaultValue === undefined) {
    return "";
  }

  return ` (default: ${defaultValue})`;
}

export function getUsageString(
  task: Task,
  options: ReturnType<typeof parseOptions>["options"],
  positionalArguments: ReturnType<typeof parseOptions>["positionalArguments"],
): string {
  let output = `Usage: hardhat [GLOBAL OPTIONS] ${task.id.join(" ")}`;

  if (options.length > 0) {
    output += ` ${options
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((o) => {
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- We want to explicitly handle all the other types via the default case
        switch (o.type) {
          case "FLAG":
            return `[${o.name}]`;
          default:
            return `[${o.name} <${o.type}>]`;
        }
      })
      .join(" ")}`;
  }

  if (positionalArguments.length > 0) {
    output += ` [--] ${positionalArguments
      .map((a) => (a.isRequired === true ? a.name : `[${a.name}]`))
      .join(" ")}`;
  }

  return output;
}
