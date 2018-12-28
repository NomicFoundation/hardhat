import { Tx } from "web3x/eth";

import { IEthereumProvider } from "./ethereum";
import { wrapSend } from "./wrapper";

export function createNetworkProvider(
  provider: IEthereumProvider,
  chainId?: number
) {
  let cachedChainId: number | undefined;

  async function getRealChainId(): Promise<number> {
    if (cachedChainId === undefined) {
      cachedChainId = parseInt(await provider.send("net_version"), 10);
    }

    return cachedChainId;
  }

  return wrapSend(provider, async (method: string, params: any[]) => {
    const realChainId = await getRealChainId();

    if (chainId !== undefined && realChainId !== chainId) {
      throw Error("chainIds don't match");
    }

    if (method === "eth_sendTransaction") {
      const tx: Tx = params[0];

      if (tx !== undefined) {
        if (tx.chainId === undefined) {
          tx.chainId = realChainId;
        } else if (tx.chainId !== realChainId) {
          throw Error("chainIds don't match");
        }
      }
    }

    return provider.send(method, params);
  });
}
