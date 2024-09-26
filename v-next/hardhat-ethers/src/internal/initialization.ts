import type { HardhatEthers } from "../types.js";
import type { ArtifactsManager } from "@ignored/hardhat-vnext/types/artifacts";
import type { NetworkConfig } from "@ignored/hardhat-vnext/types/config";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { HardhatEthersProvider } from "./hardhat-ethers-provider/hardhat-ethers-provider.js";
import { HardhatHelpers } from "./hardhat-helpers/hardhat-helpers.js";

export async function initializeEthers(
  ethereumProvider: EthereumProvider,
  networkName: string,
  networkConfig: NetworkConfig,
  artifactManager: ArtifactsManager,
): Promise<HardhatEthers> {
  const ethers = await import("ethers");

  const provider = new HardhatEthersProvider(
    ethereumProvider,
    networkName,
    networkConfig,
  );

  const hardhatHelpers = new HardhatHelpers(
    provider,
    networkName,
    networkConfig,
    artifactManager,
  );

  return {
    ...ethers,

    provider,

    getSigner: (address: string) => hardhatHelpers.getSigner(address),
    getSigners: () => hardhatHelpers.getSigners(),
    getImpersonatedSigner: (address: string) =>
      hardhatHelpers.getImpersonatedSigner(address),
    getContractFactory: hardhatHelpers.getContractFactory.bind(hardhatHelpers),
    getContractFactoryFromArtifact: (...args) =>
      hardhatHelpers.getContractFactoryFromArtifact(...args),
    getContractAt: (...args) => hardhatHelpers.getContractAt(...args),
    getContractAtFromArtifact: (...args) =>
      hardhatHelpers.getContractAtFromArtifact(...args),
    deployContract: hardhatHelpers.deployContract.bind(hardhatHelpers),
  };
}
