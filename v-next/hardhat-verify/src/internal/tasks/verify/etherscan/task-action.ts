import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { resolveArgs } from "./arg-resolution.js";

const verifyEtherscanAction: NewTaskActionFunction<VerifyActionArgs> = async (
  taskArgs,
  _hre,
) => {
  const { address, constructorArgs, libraries, contract, force } =
    await resolveArgs(taskArgs);

  console.log({ address, constructorArgs, libraries, contract, force });
};

export default verifyEtherscanAction;
