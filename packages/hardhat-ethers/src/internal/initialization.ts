import type { HardhatEthers } from "../types.js";
import type * as HardhatHelpersModule from "./hardhat-helpers/hardhat-helpers.js";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { NetworkConfig } from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import * as ethers from "ethers";

import { HardhatEthersProvider } from "./hardhat-ethers-provider/hardhat-ethers-provider.js";

let HardhatHelpersImpl: typeof HardhatHelpersModule.HardhatHelpers | undefined;

export function initializeEthers(
  ethereumProvider: EthereumProvider,
  networkName: string,
  networkConfig: NetworkConfig,
  artifactManager: ArtifactManager,
): HardhatEthers {
  // Eager: the constructor only stores three fields, so deferring it behind
  // a lazy getter would be complexity without a measurable cost saving.
  const provider = new HardhatEthersProvider(
    ethereumProvider,
    networkName,
    networkConfig,
  );

  let helpersInstance: HardhatHelpersModule.HardhatHelpers | undefined;

  async function getHelpers(): Promise<HardhatHelpersModule.HardhatHelpers> {
    if (HardhatHelpersImpl === undefined) {
      ({ HardhatHelpers: HardhatHelpersImpl } = await import(
        "./hardhat-helpers/hardhat-helpers.js"
      ));
    }

    if (helpersInstance === undefined) {
      helpersInstance = new HardhatHelpersImpl(
        provider,
        networkName,
        networkConfig,
        artifactManager,
      );
    }

    return helpersInstance;
  }

  return {
    ...ethers,

    provider,

    async getSigner(address) {
      const h = await getHelpers();
      return await h.getSigner(address);
    },

    async getSigners() {
      const h = await getHelpers();
      return await h.getSigners();
    },

    async getImpersonatedSigner(address) {
      const h = await getHelpers();
      return await h.getImpersonatedSigner(address);
    },

    async getContractFactory(...args: unknown[]) {
      const h = await getHelpers();
      const typedArgs =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
           -- forwarding overloaded args to the underlying helper. */
        args as Parameters<typeof h.getContractFactory>;
      return await h.getContractFactory(...typedArgs);
    },

    async getContractFactoryFromArtifact(artifact, signerOrOptions) {
      const h = await getHelpers();
      return await h.getContractFactoryFromArtifact(artifact, signerOrOptions);
    },

    async getContractAt(nameOrAbi, address, signer) {
      const h = await getHelpers();
      return await h.getContractAt(nameOrAbi, address, signer);
    },

    async getContractAtFromArtifact(artifact, address, signer) {
      const h = await getHelpers();
      return await h.getContractAtFromArtifact(artifact, address, signer);
    },

    async deployContract(...args: unknown[]) {
      const h = await getHelpers();
      const typedArgs =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
           -- forwarding overloaded args to the underlying helper. */
        args as Parameters<typeof h.deployContract>;
      return await h.deployContract(...typedArgs);
    },
  };
}
