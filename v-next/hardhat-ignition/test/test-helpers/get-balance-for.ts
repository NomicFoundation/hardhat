import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

/**
 * Get latest balance for an address.
 */
export async function getBalanceFor(
  hre: HardhatRuntimeEnvironment,
  address: string,
): Promise<bigint> {
  const connection = await hre.network.connect();

  const balance = await connection.provider.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  });

  // TODO: revisit why this assertion is necessary.
  // looks like a Hardhat 3 typing bug.
  assertHardhatInvariant(
    typeof balance === "string",
    "Balance must be a string",
  );

  return BigInt(balance);
}
