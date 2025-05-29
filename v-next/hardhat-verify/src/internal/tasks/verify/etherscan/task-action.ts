import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { verifyContract } from "../../../verification.js";

import { resolveConstructorArgs, resolveLibraries } from "./arg-resolution.js";

const verifyEtherscanAction: NewTaskActionFunction<VerifyActionArgs> = async (
  { constructorArgs, constructorArgsPath, librariesPath, ...verifyActionArgs },
  hre,
) => {
  // Note: this check is done at the beginning of the task to throw
  // early if the user has disabled the Etherscan verification.
  if (hre.config.verify.etherscan.enabled === false) {
    // eslint-disable-next-line no-restricted-syntax -- TODO: throw
    throw new Error("Etherscan verification is disabled in your config.");
  }

  const resolvedConstructorArgs = await resolveConstructorArgs(
    constructorArgs,
    constructorArgsPath,
  );

  const resolvedLibraries = await resolveLibraries(librariesPath);

  await verifyContract(
    {
      ...verifyActionArgs,
      constructorArgs: resolvedConstructorArgs,
      libraries: resolvedLibraries,
    },
    hre,
  );
};

export default verifyEtherscanAction;
