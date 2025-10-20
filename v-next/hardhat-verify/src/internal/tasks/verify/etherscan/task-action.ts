import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { ETHERSCAN_PROVIDER_NAME } from "../../../etherscan.js";
import { verifyContract } from "../../../verification.js";
import {
  resolveConstructorArgs,
  resolveLibraries,
} from "../../arg-resolution.js";

const verifyEtherscanAction: NewTaskActionFunction<VerifyActionArgs> = async (
  { constructorArgs, constructorArgsPath, librariesPath, ...verifyActionArgs },
  hre,
) => {
  const resolvedConstructorArgs = await resolveConstructorArgs(
    constructorArgs ?? [],
    constructorArgsPath,
  );

  const resolvedLibraries = await resolveLibraries(librariesPath);

  await verifyContract(
    {
      ...verifyActionArgs,
      constructorArgs: resolvedConstructorArgs,
      libraries: resolvedLibraries,
      provider: ETHERSCAN_PROVIDER_NAME,
    },
    hre,
  );
};

export default verifyEtherscanAction;
