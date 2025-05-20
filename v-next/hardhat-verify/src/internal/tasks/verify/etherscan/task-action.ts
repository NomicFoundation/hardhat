import type { VerifyActionArguments } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

const verifyEtherscanAction: NewTaskActionFunction<
  VerifyActionArguments
> = async (_taskArgs, _hre) => {};

export default verifyEtherscanAction;
