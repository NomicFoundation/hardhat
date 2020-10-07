import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { extendConfig, task } from "hardhat/internal/core/config/config-env";

import "./type-extensions";

export default function () {
  extendConfig((config, userConfig) => {
    const defaultConfig = { version: "latest" };
    config.vyper = { ...defaultConfig, ...config.vyper };
  });

  task(TASK_COMPILE, async (_, { config, artifacts }) => {
    const { compile } = await import("./compilation");

    // This plugin is experimental, so this task isn't split into multiple
    // subtasks yet.
    await compile(config.vyper, config.paths, artifacts);
  });
}
