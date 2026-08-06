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

declare module "hardhat/types/config" {
  export interface SolidityCompilerTypeDefinitions {
    solx: true;
  }

  export interface SlangSolxSolidityCompilerUserConfig extends CommonSolidityCompilerUserConfig {
    type: "solx";
  }

  export interface SolidityCompilerUserConfigPerType {
    solx: SlangSolxSolidityCompilerUserConfig;
  }

  export interface SlangSolxSolidityCompilerConfig extends CommonSolidityCompilerConfig {
    type: "solx";
  }

  export interface SolidityCompilerConfigPerType {
    solx: SlangSolxSolidityCompilerConfig;
  }

  export interface SlangSolxSingleVersionSolidityUserConfig
    extends
      SlangSolxSolidityCompilerUserConfig,
      CommonSingleVersionSolidityUserConfig {}

  export interface SingleVersionSolidityUserConfigPerType {
    solx: SlangSolxSingleVersionSolidityUserConfig;
  }

  export interface SlangSolxUserConfig {
    /**
     * Allow compiler type `"solx"` in the production build profile.
     * By default, solx in production is rejected as a safeguard.
     */
    dangerouslyAllowSolxInProduction?: boolean;
  }

  export interface SlangSolxConfig {
    dangerouslyAllowSolxInProduction: boolean;
  }

  export interface HardhatUserConfig {
    solx?: SlangSolxUserConfig;
  }

  export interface HardhatConfig {
    solx: SlangSolxConfig;
  }
}
