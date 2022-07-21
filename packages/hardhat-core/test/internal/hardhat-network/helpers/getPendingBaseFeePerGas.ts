import { EthereumProvider } from "../../../../src/types";
import { rpcQuantityToBN } from "../../../../src/internal/core/jsonrpc/types/base-types";

export async function getPendingBaseFeePerGas(
  provider: EthereumProvider
): Promise<bigint> {
  const pendingBlock = await provider.send("eth_getBlockByNumber", [
    "pending",
    false,
  ]);
  return rpcQuantityToBN(pendingBlock.baseFeePerGas ?? "0x1");
}
