import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:flatten",
  tasks: [
    task("flatten")
      .setDescription(
        "Flattens and prints contracts and their dependencies. If no file is passed, all the contracts in the project will be flattened.",
      )
      .setAction(import.meta.resolve("./task-action.js"))
      .addVariadicArgument({
        name: "files",
        defaultValue: [],
        description: "An optional list of files to flatten",
        type: ArgumentType.FILE,
      })
      .build(),
  ],
};

export default hardhatPlugin;
