import { IEthereumProvider } from "../../../types";

import { wrapSend } from "./wrapper";

export function createFixedGasProvider(
  provider: IEthereumProvider,
  gasLimit: number
) {
  return wrapSend(provider, async (method, params) => {
    if (method === "eth_estimateGas") {
      return gasLimit;
    }

    if (method === "eth_sendTransaction") {
      const tx = params[0];
      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = gasLimit;
      }
    }

    return provider.send(method, params);
  });
}

export function createFixedGasPriceProvider(
  provider: IEthereumProvider,
  gasPrice: number
) {
  return wrapSend(provider, async (method, params) => {
    if (method === "eth_gasPrice") {
      return gasPrice;
    }

    if (method === "eth_sendTransaction") {
      const tx = params[0];
      if (tx !== undefined && tx.gasPrice === undefined) {
        tx.gasPrice = gasPrice;
      }
    }

    return provider.send(method, params);
  });
}

export function createAutomaticGasProvider(provider: IEthereumProvider) {
  return wrapSend(provider, async (method, params) => {
    if (method === "eth_sendTransaction") {
      const tx = params[0];
      if (tx !== undefined && tx.gas === undefined) {
        tx.gas = await provider.send("eth_estimateGas", params);
      }
    }

    return provider.send(method, params);
  });
}

export function createAutomaticGasPriceProvider(provider: IEthereumProvider) {
  return wrapSend(provider, async (method, params) => {
    if (method === "eth_sendTransaction") {
      const tx = params[0];
      if (tx !== undefined && tx.gasPrice === undefined) {
        tx.gasPrice = await provider.send("eth_gasPrice");
      }
    }

    return provider.send(method, params);
  });
}
