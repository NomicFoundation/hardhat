import "hardhat/types/config";
declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    verify?: VerificationProvidersUserConfig;
  }

  export interface VerificationProvidersUserConfig {
    blockscout?: BlockscoutUserConfig;
    etherscan?: EtherscanUserConfig;
  }

  export interface BlockscoutUserConfig {
    enabled?: boolean;
  }

  export interface EtherscanUserConfig {
    apiKey: SensitiveString;
    enabled?: boolean;
  }

  export interface HardhatConfig {
    verify: VerificationProvidersConfig;
  }

  export interface VerificationProvidersConfig {
    blockscout: BlockscoutConfig;
    etherscan: EtherscanConfig;
  }

  export interface BlockscoutConfig {
    enabled: boolean;
  }

  export interface EtherscanConfig {
    apiKey: ResolvedConfigurationVariable;
    enabled: boolean;
  }
}
