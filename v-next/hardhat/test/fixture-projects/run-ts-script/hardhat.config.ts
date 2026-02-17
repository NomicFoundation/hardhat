import type { HardhatUserConfig } from "hardhat/config";

import { task } from "hardhat/config";

const config: HardhatUserConfig = {
  tasks: [
    task("test-task", "Print a test")
      .setLazyAction(async () => ({
        default: () => {
          console.log("test!");
        },
      }))

      .build(),
  ],
};

export default config;
