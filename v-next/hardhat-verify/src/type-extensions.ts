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
    apiUrl: string | undefined;
    enabled: boolean;
  }
}
