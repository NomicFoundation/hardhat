import type { VerifyContractArgs } from "./internal/verification.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

export type { VerifyContractArgs } from "./internal/verification.js";

export async function verifyContract(
  verifyContractArgs: VerifyContractArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<boolean> {
  const { verifyContract: verify } = await import("./internal/verification.js");

  return verify(verifyContractArgs, hre);
}
