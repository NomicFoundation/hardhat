import type { EthereumProvider } from "hardhat/types/providers";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { assertTxHash } from "../../assertions.js";

export async function dropTransaction(
  provider: EthereumProvider,
  txHash: string,
): Promise<boolean> {
  assertTxHash(txHash);

  const success = await provider.request({
    method: "hardhat_dropTransaction",
    params: [txHash],
  });

  assertHardhatInvariant(
    success === true || success === false,
    "The value should be either true or false",
  );

  return success;
}
