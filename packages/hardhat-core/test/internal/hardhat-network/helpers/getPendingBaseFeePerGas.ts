import { BN } from "ethereumjs-util";

import { EthereumProvider } from "../../../../src/types";
import { rpcQuantityToBN } from "../../../../src/internal/core/jsonrpc/types/base-types";

export async function getPendingBaseFeePerGas(
  provider: EthereumProvider
): Promise<BN> {
  const pendingBlock = await provider.send("eth_getBlockByNumber", [
    "pending",
    false,
  ]);
  return rpcQuantityToBN(pendingBlock.baseFeePerGas ?? "0x1");
}
