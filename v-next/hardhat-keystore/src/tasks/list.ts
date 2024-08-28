import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { list } from "../methods.js";

const taskList: NewTaskActionFunction = async () => {
  await list();
};

export default taskList;
