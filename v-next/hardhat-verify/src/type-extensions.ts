import type { VerifierHelpers } from "./types.js";

import "hardhat/types/config";
declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    verify?: VerificationProvidersUserConfig;
  }

  export interface VerificationProvidersUserConfig {
    blockscout?: BlockscoutUserConfig;
    etherscan?: EtherscanUserConfig;
    sourcify?: SourcifyUserConfig;
  }

  export interface BlockscoutUserConfig {
    enabled?: boolean;
  }

  export type EtherscanUserConfig =
    | {
        apiKey: SensitiveString;
        enabled?: true;
      }
    | {
        apiKey?: SensitiveString;
        enabled?: false;
      };

  export interface SourcifyUserConfig {
    apiUrl?: string;
    enabled?: boolean;
  }

  export interface HardhatConfig {
    verify: VerificationProvidersConfig;
  }

  export interface VerificationProvidersConfig {
    blockscout: BlockscoutConfig;
    etherscan: EtherscanConfig;
    sourcify: SourcifyConfig;
  }

  export interface BlockscoutConfig {
    enabled: boolean;
  }

  export interface EtherscanConfig {
    apiKey: ResolvedConfigurationVariable;
    enabled: boolean;
  }

  export interface SourcifyConfig {
    apiUrl?: string;
    enabled: boolean;
  }
}

import "hardhat/types/network";
declare module "hardhat/types/network" {
  interface NetworkConnection<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the ChainTypeT must be declared in the interface but in this scenario it's not used
    ChainTypeT extends ChainType | string = DefaultChainType,
  > {
    verifier: VerifierHelpers;
  }
}
