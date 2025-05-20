import type { VerifyActionArguments } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

const verifyBlockscoutAction: NewTaskActionFunction<
  VerifyActionArguments
> = async (_taskArgs, _hre) => {
  console.warn("Verification with Blockscout is not supported yet.");
};

export default verifyBlockscoutAction;
