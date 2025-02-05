import type { HardhatRuntimeEnvironment } from "hardhat/types";

export function mineBlock(hre: HardhatRuntimeEnvironment): Promise<any> {
  return hre.network.provider.send("evm_mine");
}
