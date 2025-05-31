import type { VerifyActionArgs } from "./types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

const verifyAction: NewTaskActionFunction<VerifyActionArgs> = async (
  taskArgs,
  hre,
) => {
  await hre.tasks.getTask(["verify", "etherscan"]).run(taskArgs);
};

export default verifyAction;
