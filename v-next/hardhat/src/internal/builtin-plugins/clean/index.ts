import type { HardhatPlugin } from "../../../types/plugins.js";

import { task } from "../../core/config.js";

import "./type-extensions.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:clean",
  tasks: [
    task("clean", "Clear the cache and delete all artifacts")
      .addFlag({
        name: "global",
        description: "Clear the global cache",
      })
      .setAction(async () => import("./task-action.js"))
      .build(),
  ],
  npmPackage: "hardhat",
};

export default hardhatPlugin;
