import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { globalFlag, task } from "@ignored/hardhat-vnext-core/config";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "hardhat-foo",
  hookHandlers: {
    config: import.meta.resolve("./hookHandlers/config.js"),
    configurationVariables: import.meta.resolve(
      "./hookHandlers/configurationVariables.js",
    ),
  },
  tasks: [
    task("example", "Example task")
      .setAction(async (_, _hre) => {
        console.log("from a plugin");
      })
      .build(),
  ],
  globalOptions: [globalFlag({ name: "flag", description: "A flag" })],
};

export default hardhatPlugin;
