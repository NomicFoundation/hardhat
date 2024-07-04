import type { ParameterType } from "@ignored/hardhat-vnext-core/config";
import type { GlobalOptionDefinitions } from "@ignored/hardhat-vnext-core/types/global-options";
import type { Task } from "@ignored/hardhat-vnext-core/types/tasks";

import { BUILTIN_OPTIONS } from "../../builtin-options.js";

export const GLOBAL_NAME_PADDING = 6;

interface ArgumentDescriptor {
  name: string;
  description: string;
  type?: ParameterType;
  isRequired?: boolean;
}

export function parseGlobalOptions(
  globalOptionDefinitions: GlobalOptionDefinitions,
): ArgumentDescriptor[] {
  const formattedBuiltinOptions = BUILTIN_OPTIONS.map(
    ({ name, description }) => ({
      name: formatOptionName(name),
      description,
    }),
  );

  const formattedUserOptions = Array.from(globalOptionDefinitions).map(
    ([, entry]) => {
      return {
        name: formatOptionName(entry.option.name),
        description: entry.option.description,
      };
    },
  );

  return [...formattedBuiltinOptions, ...formattedUserOptions];
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

  for (const argument of task.positionalParameters) {
    positionalArguments.push({
      name: argument.name,
      description: argument.description,
      isRequired: argument.defaultValue === undefined,
    });
  }

  return { options, positionalArguments };
}

export function formatOptionName(str: string): string {
  return `--${str
    .split("")
    .map((letter, idx) => {
      return letter.toUpperCase() === letter
        ? `${idx !== 0 ? "-" : ""}${letter.toLowerCase()}`
        : letter;
    })
    .join("")}`;
}

export function getLongestNameLength(tasks: Array<{ name: string }>): number {
  return tasks.reduce((acc, { name }) => Math.max(acc, name.length), 0);
}

export function getSection(
  title: string,
  items: ArgumentDescriptor[],
  namePadding: number,
): string {
  return `\n${title}:\n\n${items.map(({ name, description }) => `  ${name.padEnd(namePadding)}${description}`).join("\n")}\n`;
}

export function getUsageString(
  task: Task,
  options: ReturnType<typeof parseOptions>["options"],
  positionalArguments: ReturnType<typeof parseOptions>["positionalArguments"],
): string {
  let output = `Usage: hardhat [GLOBAL OPTIONS] ${task.id.join(" ")}`;

  if (options.length > 0) {
    output += ` ${options.map((o) => `[${o.name}${o.type === "BOOLEAN" ? "" : ` <${o.type}>`}]`).join(" ")}`;
  }

  if (positionalArguments.length > 0) {
    output += ` [--] ${positionalArguments.map((a) => (a.isRequired === true ? a.name : `[${a.name}]`)).join(" ")}`;
  }

  return output;
}
