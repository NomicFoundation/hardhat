import type { EthereumProvider } from "hardhat/types/providers";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

export async function latest(provider: EthereumProvider): Promise<number> {
  const latestBlock = await provider.request({
    method: "eth_getBlockByNumber",
    params: ["latest", false],
  });

  assertHardhatInvariant(
    typeof latestBlock === "object" &&
      latestBlock !== null &&
      "timestamp" in latestBlock &&
      typeof latestBlock.timestamp === "string",
    "latestBlock should have a timestamp",
  );

  return parseInt(latestBlock.timestamp, 16);
}
