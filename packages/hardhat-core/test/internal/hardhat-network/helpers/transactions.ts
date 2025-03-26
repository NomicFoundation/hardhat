import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { EthereumProvider } from "../../../../src/types";

import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
} from "./providers";

export async function deployContract(
  provider: EthereumProvider,
  deploymentCode: string,
  from = DEFAULT_ACCOUNTS_ADDRESSES[0],
  value = 0
): Promise<string> {
  const hash = await provider.send("eth_sendTransaction", [
    {
      from,
      data: deploymentCode,
      gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
      value: numberToRpcQuantity(value),
    },
  ]);

  const { contractAddress } = await provider.send("eth_getTransactionReceipt", [
    hash,
  ]);

  return contractAddress;
}
