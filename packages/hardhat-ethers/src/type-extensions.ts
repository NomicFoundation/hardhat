import type { HardhatEthers } from "./types.js";

declare module "hardhat/types/network" {
  interface NetworkConnection<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the ChainTypeT must be declared in the interface but in this scenario it's not used
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    ethers: HardhatEthers;
  }
}

declare module "hardhat/types/config" {
  export interface HardhatEthersNetworkUserConfig {
    /**
     * When enabled, HardhatEthersSigner.sendTransaction waits until the
     * transaction receipt is available before resolving.
     *
     * The default is false, matching ethers' JsonRpcSigner behavior.
     */
    waitForTransactionReceipts?: boolean;
  }

  export interface HardhatEthersNetworkConfig {
    waitForTransactionReceipts: boolean;
  }

  export interface HttpNetworkUserConfig {
    ethers?: HardhatEthersNetworkUserConfig;
  }

  export interface EdrNetworkUserConfig {
    ethers?: HardhatEthersNetworkUserConfig;
  }

  export interface HttpNetworkConfig {
    ethers: HardhatEthersNetworkConfig;
  }

  export interface EdrNetworkConfig {
    ethers: HardhatEthersNetworkConfig;
  }
}
