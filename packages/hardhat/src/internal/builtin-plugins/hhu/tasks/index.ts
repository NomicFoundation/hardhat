import type { UtilsTaskDefinition } from "../types.js";

import { emptyTask } from "../../../core/config.js";

import { constants } from "./constants/index.js";
import { convert } from "./convert/index.js";
import { fetch } from "./fetch/index.js";

export interface GenerateTasksOptions {
  /**
   * Whether to nest every task under a top-level `utils` task. Used by the
   * Hardhat CLI (`hardhat utils constants ...`) but not by the standalone hhu
   * binary (`hhu constants ...`).
   */
  prefixWithUtils: boolean;
}

/**
 * The category builders that contribute the utils tasks. Each one receives the
 * id prefix to nest its tasks under and returns its task definitions. Adding a
 * new category is a single entry here.
 */
const CATEGORIES = [constants, convert, fetch];

export function generateTasks(
  options: GenerateTasksOptions,
): UtilsTaskDefinition[] {
  const prefix = options.prefixWithUtils ? ["utils"] : [];

  return [
    ...(prefix.length > 0
      ? [emptyTask(prefix, "Utilities for common Ethereum tasks").build()]
      : []),
    ...CATEGORIES.flatMap((category) => category(prefix)),
  ];
}
