import { numberToRpcQuantity } from "../../../../src/internal/hardhat-network/provider/output";
import { EthereumProvider } from "../../../../types";

import { DEFAULT_ACCOUNTS_ADDRESSES } from "./providers";

export async function sendDummyTransaction(
  provider: EthereumProvider,
  nonce: number
) {
  return provider.send("eth_sendTransaction", [
    {
      from: DEFAULT_ACCOUNTS_ADDRESSES[0],
      to: DEFAULT_ACCOUNTS_ADDRESSES[1],
      nonce: numberToRpcQuantity(nonce),
    },
  ]);
}
