import type { VerifyActionArgs } from "../types.js";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { SOURCIFY_PROVIDER_NAME } from "../../../sourcify.js";
import { verifyContract } from "../../../verification.js";
import { resolveLibraries } from "../../arg-resolution.js";

const verifySourcifyAction: NewTaskActionFunction<VerifyActionArgs> = async (
  { librariesPath, ...verifyActionArgs },
  hre,
) => {
  const resolvedLibraries = await resolveLibraries(librariesPath);

  await verifyContract(
    {
      ...verifyActionArgs,
      libraries: resolvedLibraries,
      provider: SOURCIFY_PROVIDER_NAME,
    },
    hre,
  );
};

export default verifySourcifyAction;
