import type {
  ChainDescriptorConfig,
  ChainDescriptorsConfig,
} from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";

// TODO: cache the chainId
export async function getChainId(provider: EthereumProvider): Promise<number> {
  const response = await provider.request({ method: "eth_chainId" });
  assertHardhatInvariant(
    typeof response === "string",
    "eth_chainId response is not a string",
  );
  return Number(response);
}

export async function getChainDescriptor(
  chainId: number,
  chainDescriptors: ChainDescriptorsConfig,
  networkName: string,
): Promise<ChainDescriptorConfig> {
  const chainDescriptor = chainDescriptors.get(toBigInt(chainId));

  if (chainDescriptor === undefined) {
    /*
      // TODO: throw a different error if the network is a development network.
      // See isDevelopmentNetwork in hardhat-viem
      if (networkName === HARDHAT_NETWORK_NAME) {
        throw new HardhatNetworkNotSupportedError();
      }
      */
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.NETWORK_NOT_SUPPORTED,
      {
        networkName,
        chainId,
      },
    );
  }

  return chainDescriptor;
}
