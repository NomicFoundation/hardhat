import type { VerifyContractArgs } from "./internal/verification.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { verifyContract as verify } from "./internal/verification.js";

export type { VerifyContractArgs } from "./internal/verification.js";

export async function verifyContract(
  verifyContractArgs: VerifyContractArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<boolean> {
  return verify(verifyContractArgs, hre);
}
