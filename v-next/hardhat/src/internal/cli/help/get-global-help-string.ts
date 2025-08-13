import type { GlobalOptionDefinitions } from "../../../types/global-options.js";
import type { Task } from "../../../types/tasks.js";

import { getHardhatVersion } from "../../utils/package.js";

import {
  GLOBAL_NAME_PADDING,
  getLongestNameLength,
  getSection,
  parseTasks,
  parseGlobalOptions,
} from "./utils.js";

export async function getGlobalHelpString(
  rootTasks: Map<string, Task>,
  globalOptionDefinitions: GlobalOptionDefinitions,
): Promise<string> {
  const version = await getHardhatVersion();

  const { tasks, subtasks } = parseTasks(rootTasks);

  const globalOptions = parseGlobalOptions(globalOptionDefinitions);

  const namePadding =
    getLongestNameLength([...tasks, ...subtasks, ...globalOptions]) +
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

  output += getSection("GLOBAL OPTIONS", globalOptions, namePadding);

  output += `\nTo get help for a specific task run: npx hardhat <TASK> [SUBTASK] --help`;

  return output;
}
