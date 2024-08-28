import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { remove } from "../methods.js";

interface TaskDeleteArguments {
  key: string;
}

const taskDelete: NewTaskActionFunction<TaskDeleteArguments> = async ({
  key,
}) => {
  await remove(key);
};

export default taskDelete;
