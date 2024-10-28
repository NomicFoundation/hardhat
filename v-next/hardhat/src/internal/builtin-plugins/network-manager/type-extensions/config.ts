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
    accounts?: HttpNetworkAccountsUserConfig;

    // HTTP network specific
    url: string;
    timeout?: number;
    httpHeaders?: Record<string, string>;
  }

  export type HttpNetworkAccountsUserConfig =
    | REMOTE
    | string[]
    | HDAccountsUserConfig;

  export interface HDAccountsUserConfig {
    mnemonic: string;
    initialIndex?: number;
    count?: number;
    path?: string;
    passphrase?: string;
  }

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

  export interface GenesisAccount {
    privateKey: string;
    balance: string | number | bigint;
  }

  export interface ForkConfig {
    jsonRpcUrl: string;
    blockNumber?: bigint;
    httpHeaders?: Record<string, string>;
  }

  export interface EdrNetworkUserConfig {
    type: "edr";
    chainId?: number;
    chainType?: ChainType;
    from?: string;
    gas?: GasUserConfig;
    gasMultiplier?: number;
    gasPrice?: GasUserConfig;
    accounts?: EdrNetworkAccountsUserConfig;

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
    initialBaseFeePerGas?: number;
    initialDate?: Date;
    coinbase?: string;
    // TODO: This isn't how it's called in v2
    forkConfig?: ForkConfig;
    // TODO: This isn't configurable in v2
    forkCachePath?: string;
  }

  export type EdrNetworkAccountsUserConfig =
    | EdrNetworkAccountUserConfig[]
    | EdrNetworkHDAccountsUserConfig;

  export interface EdrNetworkAccountUserConfig {
    privateKey: string;
    balance: string;
  }

  export interface EdrNetworkHDAccountsUserConfig {
    mnemonic?: string;
    initialIndex?: number;
    count?: number;
    path?: string;
    accountsBalance?: string;
    passphrase?: string;
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
    accounts: HttpNetworkAccountsConfig;

    // HTTP network specific
    url: string;
    timeout: number;
    httpHeaders: Record<string, string>;
  }

  export type REMOTE = "remote";

  export type HttpNetworkAccountsConfig =
    | REMOTE
    | string[]
    | HttpNetworkHDAccountsConfig;

  export interface HttpNetworkHDAccountsConfig {
    mnemonic: string;
    initialIndex: number;
    count: number;
    path: string;
    passphrase: string;
  }

  export interface EdrNetworkConfig {
    type: "edr";
    chainId: number;
    chainType?: ChainType;
    from?: string;
    gas: GasConfig;
    gasMultiplier: number;
    gasPrice: GasConfig;
    // TODO: make this required and resolve the accounts in the config hook handler
    accounts?: EdrNetworkAccountsConfig;

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

    initialBaseFeePerGas?: number;
    initialDate?: Date;
    coinbase?: string;
    forkConfig?: ForkConfig;
    forkCachePath?: string;
  }

  export type EdrNetworkAccountsConfig =
    | EdrNetworkHDAccountsConfig
    | EdrNetworkAccountConfig[];

  export interface EdrNetworkAccountConfig {
    privateKey: string;
    balance: string;
  }

  export interface EdrNetworkHDAccountsConfig {
    mnemonic: string;
    initialIndex: number;
    count: number;
    path: string;
    accountsBalance: string;
    passphrase: string;
  }
}
