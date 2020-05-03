import { IEthereumProvider } from "../../../types";
import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

export function rpcQuantityToNumber(quantity?: string) {
  if (quantity === undefined) {
    throw new BuidlerError(ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE, {
      value: quantity,
    });
  }

  if (
    typeof quantity !== "string" ||
    quantity.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) === null
  ) {
    throw new BuidlerError(ERRORS.NETWORK.INVALID_RPC_QUANTITY_VALUE, {
      value: quantity,
    });
  }

  return parseInt(quantity.substring(2), 16);
}

export function numberToRpcQuantity(n: number) {
  const hex = n.toString(16);
  return `0x${hex}`;
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
        const id: string = await provider.send("net_version");
        cachedChainId = id.startsWith("0x")
          ? rpcQuantityToNumber(id)
          : parseInt(id, 10);
      }
    }

    return cachedChainId;
  };
}
