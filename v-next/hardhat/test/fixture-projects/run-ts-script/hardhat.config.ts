import type { HardhatUserConfig } from "hardhat/config";

import { task } from "hardhat/config";

const config: HardhatUserConfig = {
  tasks: [
    task("test-task", "Prints a test")
      .setAction({
        action: async () => ({
          default: () => {
            console.log("test!");
          },
        }),
      })
      .build(),
  ],
};

export default config;
