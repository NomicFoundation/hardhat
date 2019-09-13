import { IEthereumProvider } from "../../../types";
import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

import { createChainIdGetter, rpcQuantityToNumber } from "./provider-utils";
import { wrapSend } from "./wrapper";

export function createChainIdValidationProvider(
  provider: IEthereumProvider,
  chainId?: number
) {
  const getChainId = createChainIdGetter(provider);

  return wrapSend(provider, async (method: string, params: any[]) => {
    const realChainId = await getChainId();

    if (chainId !== undefined && realChainId !== chainId) {
      throw new BuidlerError(ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID, {
        configChainId: chainId,
        connectionChainId: realChainId
      });
    }

    return provider.send(method, params);
  });
}
