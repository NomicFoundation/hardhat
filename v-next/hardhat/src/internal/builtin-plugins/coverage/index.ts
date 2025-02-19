import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:coverage",
  tasks: [
    task("coverage")
      .setDescription("Not implemented yet - to be available soon")
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
};

export default hardhatPlugin;
