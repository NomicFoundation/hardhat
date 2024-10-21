import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:solidity-tests",
  tasks: [
    task(["test:solidity"], "Run the Solidity tests")
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
};

export default hardhatPlugin;
