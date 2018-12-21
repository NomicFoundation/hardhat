import { Tx } from "web3x/eth";

import { IEthereumProvider } from "./ethereum";
import { wrapSend } from "./wrapper";

export function createNetworkProvider(
  provider: IEthereumProvider,
  chainId: number
) {
  let obtainedChainId: number | undefined;

  return wrapSend(provider, async (method: string, params: any[]) => {
    if (obtainedChainId === undefined) {
      obtainedChainId = parseInt(await provider.send("net_version"), 10);
    }
    if (obtainedChainId !== chainId) {
      throw Error("chainIds don't match");
    }
    if (method === "eth_sendTransaction") {
      const tx: Tx = params[0];
      if (tx !== undefined) {
        if (tx.chainId === undefined) {
          tx.chainId = chainId;
        } else if (tx.chainId !== chainId) {
          throw Error("chainIds don't match");
        }
      }
    }

    return provider.send(method, params);
  });
}
