import type { ChainType, DefaultChainType } from "../../../../types/network.js";

import "../../../../types/config.js";
declare module "../../../../types/config.js" {
  export interface HardhatUserConfig {
    defaultChainType?: DefaultChainType;
    defaultNetwork?: string;
    networks?: Record<string, NetworkUserConfig>;
  }

  export type NetworkUserConfig = HttpNetworkUserConfig | EdrNetworkUserConfig;

  export interface HttpNetworkUserConfig {
    type: "http";
    accounts?: HttpNetworkAccountsUserConfig;
    chainId?: number;
    chainType?: ChainType;
    from?: string;
    gas?: GasUserConfig;
    gasMultiplier?: number;
    gasPrice?: GasUserConfig;

    // HTTP network specific
    url: string;
    httpHeaders?: Record<string, string>;
    timeout?: number;
  }

  export type HttpNetworkAccountsUserConfig =
    | REMOTE
    | SensitiveString[]
    | HDAccountsUserConfig;

  export type REMOTE = "remote";

  export interface HDAccountsUserConfig {
    mnemonic: string;
    count?: number;
    initialIndex?: number;
    passphrase?: string;
    path?: string;
  }

  export type GasUserConfig = "auto" | number | bigint;

  export interface EdrNetworkUserConfig {
    type: "edr";
    accounts?: EdrNetworkAccountsUserConfig;
    chainId?: number;
    chainType?: ChainType;
    from?: string;
    gas?: GasUserConfig;
    gasMultiplier?: number;
    gasPrice?: GasUserConfig;

    // EDR network specific
    allowBlocksWithSameTimestamp?: boolean;
    allowUnlimitedContractSize?: boolean;
    blockGasLimit?: number;
    chains?: HardhatNetworkChainsUserConfig;
    coinbase?: string;
    enableRip7212?: boolean;
    enableTransientStorage?: boolean;
    forking?: HardhatNetworkForkingUserConfig;
    hardfork?: string;
    initialBaseFeePerGas?: number;
    initialDate?: string | Date;
    loggingEnabled?: boolean;
    minGasPrice?: number | bigint;
    mining?: HardhatNetworkMiningUserConfig;
    networkId?: number;
    throwOnCallFailures?: boolean;
    throwOnTransactionFailures?: boolean;
  }

  export type EdrNetworkAccountsUserConfig =
    | EdrNetworkAccountUserConfig[]
    | EdrNetworkHDAccountsUserConfig;

  export interface EdrNetworkAccountUserConfig {
    balance: string;
    privateKey: string;
  }

  export interface EdrNetworkHDAccountsUserConfig {
    mnemonic?: string;
    accountsBalance?: string;
    count?: number;
    initialIndex?: number;
    passphrase?: string;
    path?: string;
  }

  export type HardhatNetworkChainsUserConfig = Map<
    number /* chainId */,
    HardhatNetworkChainUserConfig
  >;

  export interface HardhatNetworkChainUserConfig {
    hardforkHistory: HardforkHistoryConfig;
  }

  export type HardforkHistoryConfig = Map<
    string /* hardforkName */,
    number /* blockNumber */
  >;

  export interface HardhatNetworkForkingUserConfig {
    enabled?: boolean;
    url: string;
    blockNumber?: number;
    httpHeaders?: Record<string, string>;
  }

  export interface HardhatNetworkMiningUserConfig {
    auto?: boolean;
    interval?: number | [number, number];
    mempool?: HardhatNetworkMempoolUserConfig;
  }

  export interface HardhatNetworkMempoolUserConfig {
    order?: "fifo" | "priority";
  }

  export interface HardhatConfig {
    defaultChainType: DefaultChainType;
    defaultNetwork: string;
    networks: Record<string, NetworkConfig>;
  }

  export type NetworkConfig = HttpNetworkConfig | EdrNetworkConfig;

  export interface HttpNetworkConfig {
    type: "http";
    accounts: HttpNetworkAccountsConfig;
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

  export type HttpNetworkAccountsConfig =
    | REMOTE
    | ResolvedConfigurationVariable[]
    | HttpNetworkHDAccountsConfig;

  export interface HttpNetworkHDAccountsConfig {
    mnemonic: string;
    count: number;
    initialIndex: number;
    passphrase: string;
    path: string;
  }

  export type GasConfig = "auto" | bigint;

  export interface EdrNetworkConfig {
    type: "edr";
    // TODO: make this required and resolve the accounts in the config hook handler
    accounts?: EdrNetworkAccountsConfig;
    chainId: number;
    chainType?: ChainType;
    from?: string;
    gas: GasConfig;
    gasMultiplier: number;
    gasPrice: GasConfig;

    // EDR network specific
    allowBlocksWithSameTimestamp: boolean;
    allowUnlimitedContractSize: boolean;
    blockGasLimit: number;
    chains: HardhatNetworkChainsConfig;
    coinbase?: string;
    enableRip7212: boolean;
    enableTransientStorage: boolean;
    forking?: HardhatNetworkForkingConfig;
    hardfork: string;
    initialBaseFeePerGas?: number;
    initialDate: Date;
    loggingEnabled: boolean;
    minGasPrice: bigint;
    mining: HardhatNetworkMiningConfig;
    networkId: number;
    throwOnCallFailures: boolean;
    throwOnTransactionFailures: boolean;
  }

  export type EdrNetworkAccountsConfig =
    | EdrNetworkAccountConfig[]
    | EdrNetworkHDAccountsConfig;

  export interface EdrNetworkAccountConfig {
    balance: string;
    privateKey: string;
  }

  export interface EdrNetworkHDAccountsConfig {
    mnemonic: string;
    accountsBalance: string;
    count: number;
    initialIndex: number;
    passphrase: string;
    path: string;
  }

  export type HardhatNetworkChainsConfig = Map<
    number /* chainId */,
    HardhatNetworkChainConfig
  >;

  export interface HardhatNetworkChainConfig {
    hardforkHistory: HardforkHistoryConfig;
  }

  export interface HardhatNetworkForkingConfig {
    enabled: boolean;
    url: string;
    blockNumber?: number;
    httpHeaders?: Record<string, string>;
  }

  export interface HardhatNetworkMiningConfig {
    auto: boolean;
    interval: number | [number, number];
    mempool: HardhatNetworkMempoolConfig;
  }

  export interface HardhatNetworkMempoolConfig {
    order: "fifo" | "priority";
  }
}
