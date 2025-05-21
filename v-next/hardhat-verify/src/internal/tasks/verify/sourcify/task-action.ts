import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

const verifySourcifyAction: NewTaskActionFunction<VerifyActionArgs> = async (
  _taskArgs,
  _hre,
) => {
  console.warn("Verification with Sourcify is not supported yet.");
};

export default verifySourcifyAction;
