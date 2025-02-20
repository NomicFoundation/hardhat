import type { NetworkConnection } from "hardhat/types/network";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

/**
 * Get latest balance for an address.
 */
export async function getBalanceFor(
  connection: NetworkConnection,
  address: string,
): Promise<bigint> {
  const balance = await connection.provider.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  });

  assertHardhatInvariant(
    typeof balance === "string",
    "Balance must be a string",
  );

  return BigInt(balance);
}
