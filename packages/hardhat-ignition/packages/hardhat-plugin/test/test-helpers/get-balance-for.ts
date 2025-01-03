import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Get latest balance for an address.
 */
export async function getBalanceFor(
  hre: HardhatRuntimeEnvironment,
  address: string
): Promise<bigint> {
  const balance = await hre.network.provider.send("eth_getBalance", [
    address,
    "latest",
  ]);

  return BigInt(balance);
}
