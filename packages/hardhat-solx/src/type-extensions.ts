import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface SolidityCompilerTypeDefinitions {
    solx: true;
  }

  export interface SolxSolidityCompilerUserConfig
    extends CommonSolidityCompilerUserConfig {
    type: "solx";
  }

  export interface SolidityCompilerUserConfigPerType {
    solx: SolxSolidityCompilerUserConfig;
  }

  export interface SolxSolidityCompilerConfig
    extends CommonSolidityCompilerConfig {
    type: "solx";
  }

  export interface SolidityCompilerConfigPerType {
    solx: SolxSolidityCompilerConfig;
  }

  export interface SolxSingleVersionSolidityUserConfig
    extends SolxSolidityCompilerUserConfig,
      CommonSolidityUserConfig {}

  export interface SingleVersionSolidityUserConfigPerType {
    solx: SolxSingleVersionSolidityUserConfig;
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
