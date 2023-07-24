import chalk from "chalk";
import { subtask } from "hardhat/config";

import { TASK_VERIFY_SOURCIFY_DISABLED_WARNING } from "../task-names";

subtask(TASK_VERIFY_SOURCIFY_DISABLED_WARNING, async () => {
  console.warn(
    chalk.yellow(
      `WARNING: Skipping Sourcify verification: Sourcify is disabled. To enable it, add this entry to your config:

sourcify: {
enabled: true
}

Learn more at https://...`
    )
  );
});
