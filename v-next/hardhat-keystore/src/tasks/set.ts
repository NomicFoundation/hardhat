import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { set } from "../methods.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async ({
  key,
  force,
}) => {
  await set(key, force);
};

export default taskSet;
