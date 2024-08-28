import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { get } from "../methods.js";

interface TaskGetArguments {
  key: string;
}

const taskGet: NewTaskActionFunction<TaskGetArguments> = async ({ key }) => {
  await get(key);
};

export default taskGet;
