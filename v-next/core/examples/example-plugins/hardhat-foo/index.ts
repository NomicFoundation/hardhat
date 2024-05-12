import type { HardhatPlugin } from "../../../src/types/plugins.js";
import { globalFlag, task } from "../../../src/config.js";
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
  globalParameters: [globalFlag({ name: "flag", description: "A flag" })],
} satisfies HardhatPlugin;
