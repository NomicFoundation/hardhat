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
    | "remote"
    | string[]
    | HDAccountsUserConfig;

  export interface HDAccountsUserConfig {
    mnemonic: string;
    initialIndex?: number;
    count?: number;
    path?: string;
    passphrase?: string;
  }

  export interface EdrNetworkUserConfig {
    type: "edr";
    chainId: number;
    chainType?: ChainType;
    from?: string;
    gas: GasUserConfig;
    gasMultiplier: number;
    gasPrice: GasUserConfig;
    accounts?: EdrNetworkAccountsUserConfig;

    // EDR network specific
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
    from: string;
    gas: GasConfig;
    gasMultiplier: number;
    gasPrice: GasConfig;
    accounts: EdrNetworkAccountsConfig;

    // EDR network specific
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
