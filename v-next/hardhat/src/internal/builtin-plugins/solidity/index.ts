import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { globalOption, task } from "../../core/config.js";

import "./type-extensions.js";

const buildTask = task("build", "Build project")
  .addFlag({
    name: "force",
    description: "Force compilation even if no files have changed",
  })
  .addFlag({
    name: "quiet",
    description: "Make the compilation process less verbose",
  })
  .addOption({
    name: "defaultBuildProfile",
    description: "The default build profile to use",
    defaultValue: "default",
  })
  .addVariadicArgument({
    name: "files",
    description: "An optional list of files to compile",
    defaultValue: [],
  })
  .addOption({
    name: "targetSources",
    description:
      "Target sources to compile. Valid options are 'contracts' and 'tests'",
    defaultValue: "contracts",
    type: ArgumentType.STRING,
  })
  .setAction(async () => import("./tasks/build.js"))
  .build();

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity",
  dependencies: () => [import("../artifacts/index.js")],
  hookHandlers: {
    config: () => import("./hook-handlers/config.js"),
    hre: () => import("./hook-handlers/hre.js"),
  },
  tasks: [
    {
      ...buildTask,
      id: ["build"],
      description: "Build project",
    },
    {
      ...buildTask,
      id: ["compile"],
      description: "Build project (alias for build)",
    },
  ],
  globalOptions: [
    globalOption({
      name: "buildProfile",
      description: "The build profile to use",
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
      defaultValue: undefined,
    }),
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
