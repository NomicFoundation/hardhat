import type { HardhatUserConfig } from "@ignored/hardhat-vnext-core/config";

import { emptyTask } from "@ignored/hardhat-vnext-core/config";

const customTask = emptyTask("empty-task", "empty task description").build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
