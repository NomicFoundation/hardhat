import "hardhat/types/config";
declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    verify?: VerificationProvidersUserConfig;
  }

  export interface VerificationProvidersUserConfig {
    etherscan?: VerificationProviderUserConfig;
  }

  export interface VerificationProviderUserConfig {
    apiKey: SensitiveString;
    enabled?: boolean;
  }

  export interface HardhatConfig {
    verify: VerificationProvidersConfig;
  }

  export interface VerificationProvidersConfig {
    etherscan: VerificationProviderConfig;
  }

  export interface VerificationProviderConfig {
    apiKey: ResolvedConfigurationVariable;
    enabled: boolean;
  }
}
