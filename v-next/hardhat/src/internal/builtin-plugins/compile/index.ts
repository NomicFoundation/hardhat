import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "compile",
  tasks: [
    task("compile", "Compiles the entire project, building all artifacts")
      .addFlag({
        name: "quiet",
        description: "Makes the compilation process less verbose",
      })
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
};

export default hardhatPlugin;
