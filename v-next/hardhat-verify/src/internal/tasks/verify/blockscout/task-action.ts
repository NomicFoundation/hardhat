import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { capitalize } from "@nomicfoundation/hardhat-utils/string";

import { BLOCKSCOUT_PROVIDER_NAME } from "../../../blockscout.js";
import { verifyContract } from "../../../verification.js";
import {
  resolveConstructorArgs,
  resolveLibraries,
} from "../../arg-resolution.js";

const verifyBlockscoutAction: NewTaskActionFunction<VerifyActionArgs> = async (
  { constructorArgs, constructorArgsPath, librariesPath, ...verifyActionArgs },
  hre,
) => {
  // Note: this check is done at the beginning of the task to throw
  // early if the user has disabled the Blockscout verification.
  if (hre.config.verify.blockscout.enabled === false) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.VERIFICATION_DISABLED_IN_CONFIG,
      {
        verificationProvider: capitalize(BLOCKSCOUT_PROVIDER_NAME),
      },
    );
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
      provider: BLOCKSCOUT_PROVIDER_NAME,
    },
    hre,
  );
};

export default verifyBlockscoutAction;
