import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import { task } from "@ignored/hardhat-vnext/config";

const config: HardhatUserConfig = {
  tasks: [
    task("test", "Prints a test")
      .setAction(async () => {
        console.log("test!");
      })
      .build(),
  ],
};

export default config;
