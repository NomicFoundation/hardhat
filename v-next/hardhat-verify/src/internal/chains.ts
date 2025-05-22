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

export async function getChainDescriptor(
  networkName: string,
  provider: EthereumProvider,
  chainDescriptors: ChainDescriptorsConfig,
): Promise<ChainDescriptorConfig> {
  const response = await provider.request({ method: "eth_chainId" });
  assertHardhatInvariant(
    typeof response === "string",
    "eth_chainId response is not a string",
  );
  const chainId = toBigInt(response);

  const chainDescriptor = chainDescriptors.get(chainId);

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
