import { EthereumProvider } from "hardhat/types";

import { EthersProviderWrapper } from "./ethers-provider-wrapper";

/**
 * This method returns a proxy that uses an underlying provider for everything.
 *
 * This underlying provider is replaced by a new one after a successful hardhat_reset,
 * because ethers providers can have internal state that returns wrong results after
 * the network is reset.
 */
export function createProviderProxy(
  hardhatProvider: EthereumProvider
): { proxy: EthersProviderWrapper; reset: () => void } {
  const providerTarget = {
    provider: new EthersProviderWrapper(hardhatProvider),
  };

  const handler: Required<ProxyHandler<{}>> = {
    // these two functions are implemented because of the Required<ProxyHandler> type
    apply(_, thisArg, argArray) {
      throw new Error(
        "cannot be implemented because the provider is not a function"
      );
    },

    construct(_, argArray, newTarget) {
      throw new Error(
        "cannot be implemented because the provider is not a function"
      );
    },

    defineProperty(_, property, descriptor) {
      return Reflect.defineProperty(
        providerTarget.provider,
        property,
        descriptor
      );
    },

    deleteProperty(_, property) {
      return Reflect.deleteProperty(providerTarget.provider, property);
    },

    enumerate(_) {
      return [...Reflect.enumerate(providerTarget.provider)];
    },

    get(_, property, receiver) {
      return Reflect.get(providerTarget.provider, property, receiver);
    },

    getOwnPropertyDescriptor(_, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        providerTarget.provider,
        property
      );

      if (descriptor !== undefined) {
        Object.defineProperty(providerTarget.provider, property, descriptor);
      }

      return descriptor;
    },

    getPrototypeOf(_) {
      return Reflect.getPrototypeOf(providerTarget.provider);
    },

    has(_, property) {
      return Reflect.has(providerTarget.provider, property);
    },

    isExtensible(_) {
      return Reflect.isExtensible(providerTarget.provider);
    },

    ownKeys(_) {
      return Reflect.ownKeys(providerTarget.provider);
    },

    preventExtensions(_) {
      return Reflect.preventExtensions(providerTarget.provider);
    },

    set(_, property, value, receiver) {
      return Reflect.set(providerTarget.provider, property, value, receiver);
    },

    setPrototypeOf(_, prototype) {
      return Reflect.setPrototypeOf(providerTarget.provider, prototype);
    },
  };

  const providerProxy: any = new Proxy({}, handler);

  hardhatProvider.on("hardhat_reset", () => {
    providerTarget.provider = new EthersProviderWrapper(hardhatProvider);
  });

  return providerProxy;
}
