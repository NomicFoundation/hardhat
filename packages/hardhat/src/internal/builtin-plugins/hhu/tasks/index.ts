import type { TaskDefinition } from "../../../../types/tasks.js";

import { emptyTask } from "../../../core/config.js";

import { constants } from "./constants/index.js";

export interface GenerateTasksOptions {
  /**
   * Whether to nest every task under a top-level `utils` task. Used by the
   * Hardhat CLI (`hardhat utils constants ...`) but not by the standalone hhu
   * binary (`hhu constants ...`).
   */
  withUtils: boolean;
}

export function generateTasks(options: GenerateTasksOptions): TaskDefinition[] {
  return [
    ...(options.withUtils
      ? [emptyTask("utils", "Utilities for common Ethereum tasks").build()]
      : []),
    ...constants(options),
  ];
}
