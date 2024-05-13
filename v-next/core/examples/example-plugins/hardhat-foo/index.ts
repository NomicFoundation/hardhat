import type { HardhatPlugin } from "../../../src/types/plugins.js";
import "./type-extensions.js";

export default {
  id: "hardhat-foo",
  hookHandlers: {
    config: import.meta.resolve("./hookHandlers/config.js"),
    configurationVariables: import.meta.resolve(
      "./hookHandlers/configurationVariables.js",
    ),
  },
} satisfies HardhatPlugin;
