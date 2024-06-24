import type { HardhatPlugin } from "@nomicfoundation/hardhat-core/types/plugins";

import { globalFlag, task } from "@nomicfoundation/hardhat-core/config";
import "./type-extensions.js";

export default {
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
} satisfies HardhatPlugin;
