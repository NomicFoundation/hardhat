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
    slangSolx: true;
  }

  export interface SlangSolxSolidityCompilerUserConfig extends CommonSolidityCompilerUserConfig {
    type: "slangSolx";
  }

  export interface SolidityCompilerUserConfigPerType {
    slangSolx: SlangSolxSolidityCompilerUserConfig;
  }

  export interface SlangSolxSolidityCompilerConfig extends CommonSolidityCompilerConfig {
    type: "slangSolx";
  }

  export interface SolidityCompilerConfigPerType {
    slangSolx: SlangSolxSolidityCompilerConfig;
  }

  export interface SlangSolxSingleVersionSolidityUserConfig
    extends
      SlangSolxSolidityCompilerUserConfig,
      CommonSingleVersionSolidityUserConfig {}

  export interface SingleVersionSolidityUserConfigPerType {
    slangSolx: SlangSolxSingleVersionSolidityUserConfig;
  }

  export interface SlangSolxUserConfig {
    /**
     * Allow compiler type `"slangSolx"` in the production build profile.
     * By default, `"slangSolx"` in production is rejected as a safeguard.
     */
    dangerouslyAllowSlangSolxInProduction?: boolean;
  }

  export interface SlangSolxConfig {
    dangerouslyAllowSlangSolxInProduction: boolean;
  }

  export interface HardhatUserConfig {
    slangSolx?: SlangSolxUserConfig;
  }

  export interface HardhatConfig {
    slangSolx: SlangSolxConfig;
  }
}
