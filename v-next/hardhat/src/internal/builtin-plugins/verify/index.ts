import type { HardhatPlugin } from "../../../types/plugins.js";

import chalk from "chalk";

import { task } from "../../core/config.js";

const hardhatPlugin: HardhatPlugin = {
  id: "builtin:verify",
  tasks: [
    task("verify")
      .setDescription("Not implemented yet - to be available soon")
      .setAction(() =>
        console.log(
          chalk.yellow(
            "This task will be implemented soon. Please check our communication channels for updates.",
          ),
        ),
      )
      .build(),
  ],
};

export default hardhatPlugin;
