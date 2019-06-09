import { IEthereumProvider } from "../../../types";
import { BuidlerError, ERRORS } from "../errors";

export function rpcQuantityToNumber(quantity?: string) {
  if (quantity === undefined) {
    throw new BuidlerError(
      ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE,
      "undefined"
    );
  }

  if (
    typeof quantity !== "string" ||
    quantity.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) === null
  ) {
    throw new BuidlerError(ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE, quantity);
  }

  return parseInt(quantity.substring(2), 16);
}

export function numberToRpcQuantity(n: number) {
  return "0x" + n.toString(16);
}

export function createChainIdGetter(provider: IEthereumProvider) {
  let cachedChainId: number | undefined;

  return async function getRealChainId(): Promise<number> {
    if (cachedChainId === undefined) {
      try {
        const id = await provider.send("eth_chainId");
        cachedChainId = rpcQuantityToNumber(id);
      } catch (error) {
        // If eth_chainId fails we default to net_version
        // TODO: This should be removed in the future.
        // See: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-695.md
        const id = await provider.send("net_version");
        cachedChainId = rpcQuantityToNumber(id);
      }
    }

    return cachedChainId;
  };
}
