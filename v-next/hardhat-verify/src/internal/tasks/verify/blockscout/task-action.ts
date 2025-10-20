import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

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
      provider: BLOCKSCOUT_PROVIDER_NAME,
    },
    hre,
  );
};

export default verifyBlockscoutAction;
