import { Tx } from "web3x/eth";

import { IEthereumProvider } from "../../../types";
import { BuidlerError, ERRORS } from "../errors";

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
      throw new BuidlerError(
        ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID,
        chainId,
        realChainId
      );
    }

    if (method === "eth_sendTransaction") {
      const tx: Tx = params[0];

      if (tx !== undefined) {
        if (tx.chainId === undefined) {
          tx.chainId = realChainId;
        } else if (tx.chainId !== realChainId) {
          throw new BuidlerError(
            ERRORS.NETWORK.INVALID_TX_CHAIN_ID,
            tx.chainId,
            realChainId
          );
        }
      }
    }

    return provider.send(method, params);
  });
}
