import type { HardhatEthers } from "../types.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { NetworkConfig } from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import { HardhatEthersProvider } from "./hardhat-ethers-provider/hardhat-ethers-provider.js";
import { HardhatHelpers } from "./hardhat-helpers/hardhat-helpers.js";

export async function initializeEthers(
  ethereumProvider: EthereumProvider,
  networkName: string,
  networkConfig: NetworkConfig,
  artifactManager: ArtifactManager,
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

    // The bind is necessary because otherwise in the function the "this" that refers to the HardhatHelpers class will be overwritten
    getSigner: hardhatHelpers.getSigner.bind(hardhatHelpers),
    getSigners: hardhatHelpers.getSigners.bind(hardhatHelpers),
    getImpersonatedSigner:
      hardhatHelpers.getImpersonatedSigner.bind(hardhatHelpers),
    getContractFactory: hardhatHelpers.getContractFactory.bind(hardhatHelpers),
    getContractFactoryFromArtifact:
      hardhatHelpers.getContractFactoryFromArtifact.bind(hardhatHelpers),
    getContractAt: hardhatHelpers.getContractAt.bind(hardhatHelpers),
    getContractAtFromArtifact:
      hardhatHelpers.getContractAtFromArtifact.bind(hardhatHelpers),
    deployContract: hardhatHelpers.deployContract.bind(hardhatHelpers),
  };
}
