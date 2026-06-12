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
     * When enabled, HardhatEthersSigner.sendTransaction resolves only after the
     * transaction has been mined and its receipt is available (one
     * confirmation), instead of as soon as the transaction is visible to the
     * node.
     *
     * Reverted transactions still resolve to a TransactionResponse (the signer
     * does not throw), so callers and chai matchers can inspect the receipt.
     *
     * The default is false, matching ethers' JsonRpcSigner behavior.
     *
     * Enable this only for compatibility runs against external nodes whose
     * eth_sendTransaction returns before mining. Leave it off otherwise, since
     * it changes pending-transaction timing and waits for mining on every
     * send.
     */
    waitForTransactionReceipt?: boolean;
  }

  export interface HardhatEthersNetworkConfig {
    waitForTransactionReceipt: boolean;
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
