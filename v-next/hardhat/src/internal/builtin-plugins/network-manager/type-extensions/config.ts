import type { ChainType, DefaultChainType } from "../../../../types/network.js";

import "../../../../types/config.js";
declare module "../../../../types/config.js" {
  export interface HardhatUserConfig {
    defaultChainType?: DefaultChainType;
    defaultNetwork?: string;
    networks?: Record<string, NetworkUserConfig>;
  }

  export interface HardhatConfig {
    defaultChainType: DefaultChainType;
    defaultNetwork: string;
    networks: Record<string, NetworkConfig>;
  }

  export type NetworkUserConfig = HttpNetworkUserConfig | EdrNetworkUserConfig;

  export type GasUserConfig = "auto" | number | bigint;

  export interface HttpNetworkUserConfig {
    type: "http";
    chainId?: number;
    chainType?: ChainType;
    from?: string;
    gas?: GasUserConfig;
    gasMultiplier?: number;
    gasPrice?: GasUserConfig;

    // HTTP network specific
    url: string;
    timeout?: number;
    httpHeaders?: Record<string, string>;
  }

  export interface EdrNetworkUserConfig {
    type: "edr";
    chainId: number;
    chainType?: ChainType;
    from?: string;
    gas: GasUserConfig;
    gasMultiplier: number;
    gasPrice: GasUserConfig;

    // EDR network specific
    hardfork?: string;
    networkId?: number;
    blockGasLimit?: number;
    minGasPrice?: bigint;
    automine?: boolean;
    intervalMining?: IntervalMiningConfig;
    mempoolOrder?: MempoolOrder;
    chains?: HardhatNetworkChainsConfig;
    genesisAccounts?: GenesisAccount[];
    allowUnlimitedContractSize?: boolean;
    throwOnTransactionFailures?: boolean;
    throwOnCallFailures?: boolean;
    allowBlocksWithSameTimestamp?: boolean;
    enableTransientStorage?: boolean;
    enableRip7212?: boolean;
  }

  export type NetworkConfig = HttpNetworkConfig | EdrNetworkConfig;

  export type GasConfig = "auto" | bigint;

  export interface HttpNetworkConfig {
    type: "http";
    chainId?: number;
    chainType?: ChainType;
    from?: string;
    gas: GasConfig;
    gasMultiplier: number;
    gasPrice: GasConfig;

    // HTTP network specific
    url: string;
    timeout: number;
    httpHeaders: Record<string, string>;
  }

  // TODO: should these types be re-exported from EDR?
  export type IntervalMiningConfig = number | [number, number];

  export type MempoolOrder = "fifo" | "priority";

  export type HardforkHistoryConfig = Map<
    /* hardforkName */ string,
    /* blockNumber */ number
  >;

  export interface HardhatNetworkChainConfig {
    hardforkHistory: HardforkHistoryConfig;
  }

  export type HardhatNetworkChainsConfig = Map<
    /* chainId */ number,
    HardhatNetworkChainConfig
  >;

  export type GenesisAccount = {
    privateKey: string;
    balance: string | number | bigint;
  };

  export interface EdrNetworkConfig {
    type: "edr";
    chainId: number;
    // TODO: I removed the conditional type here, is that correct?
    chainType: ChainType;
    from: string;
    gas: GasConfig;
    gasMultiplier: number;
    gasPrice: GasConfig;

    // EDR network specific
    hardfork: string;
    networkId: number;
    blockGasLimit: number;
    minGasPrice: bigint;
    automine: boolean;
    intervalMining: IntervalMiningConfig;
    mempoolOrder: MempoolOrder;
    chains: HardhatNetworkChainsConfig;
    genesisAccounts: GenesisAccount[];
    allowUnlimitedContractSize: boolean;
    throwOnTransactionFailures: boolean;
    throwOnCallFailures: boolean;
    allowBlocksWithSameTimestamp: boolean;
    enableTransientStorage: boolean;
    enableRip7212: boolean;
  }
}
