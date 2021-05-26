import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { EthereumProvider } from "../../../../types";

import { DEFAULT_ACCOUNTS_ADDRESSES } from "./providers";

interface Options {
  from?: string;
  to?: string;
  accessList?: any[];
  gas?: number;
}

export async function sendDummyTransaction(
  provider: EthereumProvider,
  nonce: number,
  {
    from = DEFAULT_ACCOUNTS_ADDRESSES[0],
    to = DEFAULT_ACCOUNTS_ADDRESSES[1],
    accessList,
    gas = 21_000,
  }: Options = {}
) {
  const tx: any = {
    from,
    to,
    nonce: numberToRpcQuantity(nonce),
    gas: numberToRpcQuantity(gas),
  };

  if (accessList !== undefined) {
    tx.accessList = accessList;
  }
  return provider.send("eth_sendTransaction", [tx]);
}
