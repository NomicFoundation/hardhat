import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

export async function latestBlock(provider: EthereumProvider): Promise<number> {
  const height = await provider.request({
    method: "eth_blockNumber",
    params: [],
  });

  assertHardhatInvariant(
    typeof height === "string",
    "height should be a string",
  );

  return parseInt(height, 16);
}
