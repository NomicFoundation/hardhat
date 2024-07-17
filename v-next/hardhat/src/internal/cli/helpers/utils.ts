import type { ArgumentType } from "@ignored/hardhat-vnext-core/config";
import type { GlobalOptionDefinitions } from "@ignored/hardhat-vnext-core/types/global-options";
import type { Task } from "@ignored/hardhat-vnext-core/types/tasks";

import { camelToKebabCase } from "@ignored/hardhat-vnext-utils/string";

export const GLOBAL_NAME_PADDING = 6;

interface ArgumentDescriptor {
  name: string;
  description: string;
  type?: ArgumentType;
  isRequired?: boolean;
}

export function parseGlobalOptions(
  globalOptionDefinitions: GlobalOptionDefinitions,
): ArgumentDescriptor[] {
  return [...globalOptionDefinitions].map(([, { option }]) => ({
    name: formatOptionName(option.name),
    description: option.description,
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

    tasks.push({ name: taskName, description: task.description });
  }

  return { tasks, subtasks };
}

export function parseSubtasks(task: Task): ArgumentDescriptor[] {
  const subtasks = [];

  for (const [, subtask] of task.subtasks) {
    subtasks.push({
      name: subtask.id.join(" "),
      description: subtask.description,
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
      name: formatOptionName(optionName),
      description: option.description,
      type: option.type,
    });
  }

  for (const argument of task.positionalArguments) {
    positionalArguments.push({
      name: argument.name,
      description: argument.description,
      isRequired: argument.defaultValue === undefined,
    });
  }

  return { options, positionalArguments };
}

export function formatOptionName(str: string): string {
  return `--${camelToKebabCase(str)}`;
}

export function getLongestNameLength(tasks: Array<{ name: string }>): number {
  return tasks.reduce((acc, { name }) => Math.max(acc, name.length), 0);
}

export function getSection(
  title: string,
  items: ArgumentDescriptor[],
  namePadding: number,
): string {
  return `\n${title}:\n\n${items
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      ({ name, description }) => `  ${name.padEnd(namePadding)}${description}`,
    )
    .join("\n")}\n`;
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
      .map((o) => `[${o.name}${o.type === "BOOLEAN" ? "" : ` <${o.type}>`}]`)
      .join(" ")}`;
  }

  if (positionalArguments.length > 0) {
    output += ` [--] ${positionalArguments
      .map((a) => (a.isRequired === true ? a.name : `[${a.name}]`))
      .join(" ")}`;
  }

  return output;
}
