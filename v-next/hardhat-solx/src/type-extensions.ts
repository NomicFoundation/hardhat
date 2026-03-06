import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface SolidityCompilerTypeDefinitions {
    solx: true;
  }

  export interface SolxUserConfig {
    /**
     * Allow compiler type `"solx"` in the production build profile.
     * By default, solx in production is rejected as a safeguard.
     */
    dangerouslyAllowSolxInProduction?: boolean;
  }

  export interface SolxConfig {
    dangerouslyAllowSolxInProduction: boolean;
  }

  export interface HardhatUserConfig {
    solx?: SolxUserConfig;
  }

  export interface HardhatConfig {
    solx: SolxConfig;
  }
}
