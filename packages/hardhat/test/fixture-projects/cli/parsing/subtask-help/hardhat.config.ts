import type { HardhatUserConfig } from "../../../../../src/config.js";

import { emptyTask } from "../../../../../src/config.js";

const customTask = emptyTask("empty-task", "empty task description").build();

const config: HardhatUserConfig = {
  tasks: [customTask],
};

export default config;
