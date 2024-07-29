import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { task } from "@ignored/hardhat-vnext-core/config";

const hardhatPlugin: HardhatPlugin = {
  id: "clean",
  tasks: [
    task("clean", "Clears the cache and deletes all artifacts")
      .addFlag({
        name: "global",
        description: "Clear the global cache",
      })
      .setAction(import.meta.resolve("./task-action.js"))
      .build(),
  ],
};

export default hardhatPlugin;
