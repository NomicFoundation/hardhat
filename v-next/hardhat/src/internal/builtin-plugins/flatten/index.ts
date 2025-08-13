import type { HardhatPlugin } from "../../../types/plugins.js";

import { ArgumentType } from "../../../types/arguments.js";
import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:flatten",
  tasks: [
    task("flatten")
      .setDescription("Flattens and prints contracts and their dependencies")
      .addVariadicArgument({
        name: "files",
        defaultValue: [],
        description: "An optional list of files to flatten",
        type: ArgumentType.FILE,
      })
      .setAction(async () => import("./task-action.js"))
      .build(),
  ],
};

export default hardhatPlugin;
