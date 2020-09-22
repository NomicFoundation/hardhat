import { TASK_COMPILE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/internal/core/config/config-env";
import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";

import { VyperConfig } from "./types";
import "./type-extensions";

function getConfig(config: ResolvedBuidlerConfig): VyperConfig {
  const defaultConfig = { version: "latest" };
  return { ...defaultConfig, ...config.vyper };
}

export default function () {
  task(TASK_COMPILE, async (_, { config }) => {
    const { compile } = await import("./compilation");

    const vyperConfig = getConfig(config);

    // This plugin is experimental, so this task isn't split into multiple
    // internal tasks yet.
    await compile(vyperConfig, config.paths);
  });
}
