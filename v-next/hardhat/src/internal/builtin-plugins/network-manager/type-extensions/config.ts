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

  export interface EdrNetworkConfig {
    type: "edr";
    chainId: number;
    chainType?: ChainType;
    from: string;
    gas: GasConfig;
    gasMultiplier: number;
    gasPrice: GasConfig;

    // EDR network specific
  }
}
