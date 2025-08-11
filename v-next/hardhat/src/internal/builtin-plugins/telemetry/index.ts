import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:telemetry",
  tasks: [
    task("telemetry", "Displays and modifies your telemetry settings")
      .addFlag({
        name: "enable",
        description: "Enable telemetry",
      })
      .addFlag({
        name: "disable",
        description: "Disable telemetry",
      })
      .setAction(async () => import("./task-action.js"))
      .build(),
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
