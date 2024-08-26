import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { globalFlag, task } from "@ignored/hardhat-vnext-core/config";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-foo",
  hookHandlers: {
    config: import.meta.resolve("./hook-handlers/config.js"),
    configurationVariables: import.meta.resolve(
      "./hook-handlers/configuration-variables.js",
    ),
  },
  tasks: [
    task("example", "Example task")
      .setAction(async (_, _hre) => {
        console.log("from a plugin");
      })
      .build(),
  ],
  globalOptions: [globalFlag({ name: "fooPluginFlag", description: "A flag" })],
};

export default hardhatPlugin;
