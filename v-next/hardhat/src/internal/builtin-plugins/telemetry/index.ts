import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

import "./type-extensions.js";

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
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
