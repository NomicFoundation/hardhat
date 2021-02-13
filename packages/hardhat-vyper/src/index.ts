import {
  TASK_COMPILE_GET_COMPILATION_TASKS,
  TASK_COMPILE_SOLIDITY,
} from "hardhat/builtin-tasks/task-names";
import { extendConfig, subtask } from "hardhat/internal/core/config/config-env";

import { TASK_COMPILE_VYPER } from "./task-names";
import "./type-extensions";

extendConfig((config) => {
  const defaultConfig = { version: "latest" };
  config.vyper = { ...defaultConfig, ...config.vyper };
});

subtask(
  TASK_COMPILE_GET_COMPILATION_TASKS,
  async (): Promise<string[]> => {
    return [TASK_COMPILE_SOLIDITY, TASK_COMPILE_VYPER];
  }
);

subtask(TASK_COMPILE_VYPER, async (_, { config, artifacts }) => {
  const { compile } = await import("./compilation");

  // This plugin is experimental, so this task isn't split into multiple
  // subtasks yet.
  await compile(config.vyper, config.paths, artifacts);
});
