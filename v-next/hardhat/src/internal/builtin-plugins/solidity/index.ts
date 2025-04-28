import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { globalOption, task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity",
  dependencies: [
    async () => {
      const { default: artifactsPlugin } = await import(
        "../artifacts/index.js"
      );
      return artifactsPlugin;
    },
  ],
  hookHandlers: {
    config: import.meta.resolve("./hook-handlers/config.js"),
    hre: import.meta.resolve("./hook-handlers/hre.js"),
  },
  tasks: [
    task("compile", "Compiles your project")
      .addFlag({
        name: "force",
        description: "Force compilation even if no files have changed",
      })
      .addFlag({
        name: "quiet",
        description: "Makes the compilation process less verbose",
      })
      .addOption({
        name: "defaultBuildProfile",
        description: "The default build profile to use",
        type: ArgumentType.STRING_WITHOUT_DEFAULT,
        defaultValue: undefined,
      })
      .addVariadicArgument({
        name: "files",
        description: "An optional list of files to compile",
        defaultValue: [],
      })
      .setAction(import.meta.resolve("./tasks/compile.js"))
      .build(),
  ],
  globalOptions: [
    globalOption({
      name: "buildProfile",
      description: "The build profile to use",
      defaultValue: "default",
    }),
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
