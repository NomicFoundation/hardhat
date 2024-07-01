import type { Task } from "@ignored/hardhat-vnext-core/types/tasks";

import { BUILTIN_OPTIONS } from "../../builtin-options.js";
import { getHardhatVersion } from "../../utils/package.js";

import {
  GLOBAL_NAME_PADDING,
  formatOptionName,
  getLongestNameLength,
  getSection,
  parseTasks,
} from "./utils.js";

export async function getGlobalHelpString(
  rootTasks: Map<string, Task>,
): Promise<string> {
  const version = await getHardhatVersion();

  const { tasks, subtasks } = parseTasks(rootTasks);

  const formattedBuiltinOptions = BUILTIN_OPTIONS.map(
    ({ name, description }) => ({
      name: formatOptionName(name),
      description,
    }),
  );

  const namePadding =
    getLongestNameLength([...tasks, ...subtasks, ...formattedBuiltinOptions]) +
    GLOBAL_NAME_PADDING;

  let output = `Hardhat version ${version}

Usage: hardhat [GLOBAL OPTIONS] <TASK> [SUBTASK] [TASK OPTIONS] [--] [TASK ARGUMENTS]
`;

  if (tasks.length > 0) {
    output += getSection("AVAILABLE TASKS", tasks, namePadding);
  }

  if (subtasks.length > 0) {
    output += getSection("AVAILABLE SUBTASKS", subtasks, namePadding);
  }

  output += getSection("GLOBAL OPTIONS", formattedBuiltinOptions, namePadding);

  output += `\nTo get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

  return output;
}
