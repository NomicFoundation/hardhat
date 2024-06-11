import {
  HardhatUserConfig,
  emptyTask,
} from "@nomicfoundation/hardhat-core/config";

const customTask = emptyTask("empty-task", "empty task description").build();

export default {
  tasks: [customTask],
} satisfies HardhatUserConfig;
