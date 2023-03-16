import { EthereumProvider } from "../../../../src/types";
import { rpcQuantityToBigInt } from "../../../../src/internal/core/jsonrpc/types/base-types";

export async function getPendingBaseFeePerGas(
  provider: EthereumProvider
): Promise<bigint> {
  const pendingBlock = await provider.send("eth_getBlockByNumber", [
    "pending",
    false,
  ]);
  return rpcQuantityToBigInt(pendingBlock.baseFeePerGas ?? "0x1");
}
