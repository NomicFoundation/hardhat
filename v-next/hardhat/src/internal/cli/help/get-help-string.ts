import type { Task } from "../../../types/tasks.js";

import {
  GLOBAL_NAME_PADDING,
  parseOptions,
  getLongestNameLength,
  getSection,
  parseSubtasks,
  getUsageString,
} from "./utils.js";

export async function getHelpString(task: Task): Promise<string> {
  const { default: chalk } = await import("chalk");

  const { options, positionalArguments } = parseOptions(task);

  const subtasks = parseSubtasks(task);

  const namePadding =
    getLongestNameLength([...options, ...positionalArguments, ...subtasks]) +
    GLOBAL_NAME_PADDING;

  let output = `${chalk.bold(task.description)}`;

  if (task.isEmpty) {
    output += `\n\nUsage: hardhat [GLOBAL OPTIONS] ${task.id.join(" ")} <SUBTASK> [SUBTASK OPTIONS] [--] [SUBTASK POSITIONAL ARGUMENTS]\n`;

    if (subtasks.length > 0) {
      output += getSection("AVAILABLE SUBTASKS", subtasks, namePadding);

      output += `\nTo get help for a specific task run: npx hardhat ${task.id.join(" ")} <SUBTASK> --help`;
    }

    return output;
  }

  const usage = getUsageString(task, options, positionalArguments);

  output += `\n\n${usage}\n`;

  if (options.length > 0) {
    output += getSection("OPTIONS", options, namePadding);
  }

  if (positionalArguments.length > 0) {
    output += getSection(
      "POSITIONAL ARGUMENTS",
      positionalArguments,
      namePadding,
    );
  }

  if (subtasks.length > 0) {
    output += getSection("AVAILABLE SUBTASKS", subtasks, namePadding);
  }

  output += `\nFor global options help run: hardhat --help`;

  return output;
}
