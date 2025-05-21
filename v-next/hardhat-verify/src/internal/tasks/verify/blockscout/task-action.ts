import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

const verifyBlockscoutAction: NewTaskActionFunction<VerifyActionArgs> = async (
  _taskArgs,
  _hre,
) => {
  console.warn("Verification with Blockscout is not supported yet.");
};

export default verifyBlockscoutAction;
