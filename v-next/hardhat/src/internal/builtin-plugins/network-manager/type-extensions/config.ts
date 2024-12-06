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
    | SensitiveString[]
    | HDAccountsUserConfig;

  export interface HDAccountsUserConfig {
    mnemonic: string;
    initialIndex?: number;
    count?: number;
    path?: string;
    passphrase?: string;
  }

  export interface HardhatNetworkMiningUserConfig {
    auto?: boolean;
    interval?: number | [number, number];
    mempool?: HardhatNetworkMempoolUserConfig;
  }

  export interface HardhatNetworkMempoolUserConfig {
    order?: "fifo" | "priority";
  }

  export type HardhatNetworkChainsUserConfig = Map<
    /* chainId */ number,
    HardhatNetworkChainUserConfig
  >;

  export interface HardhatNetworkChainUserConfig {
    hardforkHistory: HardforkHistoryConfig;
  }

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

  export interface HardhatNetworkForkingUserConfig {
    enabled?: boolean;
    url: string;
    blockNumber?: number;
    httpHeaders?: { [name: string]: string };
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
    minGasPrice?: number | bigint;
    mining?: HardhatNetworkMiningUserConfig;
    chains?: HardhatNetworkChainsUserConfig;
    allowUnlimitedContractSize?: boolean;
    throwOnTransactionFailures?: boolean;
    throwOnCallFailures?: boolean;
    allowBlocksWithSameTimestamp?: boolean;
    enableTransientStorage?: boolean;
    enableRip7212?: boolean;
    initialBaseFeePerGas?: number;
    initialDate?: string | Date;
    coinbase?: string;
    forking?: HardhatNetworkForkingUserConfig;
    loggingEnabled?: boolean;
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
    | ResolvedConfigurationVariable[]
    | HttpNetworkHDAccountsConfig;

  export interface HttpNetworkHDAccountsConfig {
    mnemonic: string;
    initialIndex: number;
    count: number;
    path: string;
    passphrase: string;
  }

  export interface HardhatNetworkMiningConfig {
    auto: boolean;
    interval: number | [number, number];
    mempool: HardhatNetworkMempoolConfig;
  }

  export interface HardhatNetworkMempoolConfig {
    order: "fifo" | "priority";
  }

  export interface HardhatNetworkForkingConfig {
    enabled: boolean;
    url: string;
    blockNumber?: number;
    httpHeaders?: { [name: string]: string };
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
    mining: HardhatNetworkMiningConfig;
    chains: HardhatNetworkChainsConfig;
    allowUnlimitedContractSize: boolean;
    throwOnTransactionFailures: boolean;
    throwOnCallFailures: boolean;
    allowBlocksWithSameTimestamp: boolean;
    enableTransientStorage: boolean;
    enableRip7212: boolean;

    initialBaseFeePerGas?: number;
    initialDate: Date;
    coinbase?: string;
    forking?: HardhatNetworkForkingConfig;
    loggingEnabled: boolean;
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
