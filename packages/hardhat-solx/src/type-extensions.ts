import "hardhat/types/solidity";

declare module "hardhat/types/solidity" {
  /**
   * solx 0.1.4+ leaves `evm.{deployed,}Bytecode.sourceMap` empty and emits
   * source-mapping information as a hex-encoded ELF/DWARF blob in
   * `evm.{deployed,}Bytecode.debugInfo` instead. The plugin opts the user's
   * `outputSelection` into producing this field on every solx compile, so
   * declare it here to reflect that contract.
   */
  interface CompilerOutputBytecode {
    debugInfo?: string;
  }
}

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
      CommonSingleVersionSolidityUserConfig {}

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
