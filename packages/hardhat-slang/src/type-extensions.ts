declare module "hardhat/types/solidity" {
  /**
   * The slang pipeline, like solx 0.1.4+, leaves `evm.{deployed,}Bytecode.sourceMap`
   * empty and emits
   * source-mapping information as a hex-encoded ELF/DWARF blob in
   * `evm.{deployed,}Bytecode.debugInfo` instead. The plugin opts the user's
   * `outputSelection` into producing this field on every slang compile, so
   * declare it here to reflect that contract.
   */
  interface CompilerOutputBytecode {
    debugInfo?: string;
  }
}

declare module "hardhat/types/config" {
  export interface SolidityCompilerTypeDefinitions {
    slang: true;
  }

  export interface SlangSolidityCompilerUserConfig extends CommonSolidityCompilerUserConfig {
    type: "slang";
  }

  export interface SolidityCompilerUserConfigPerType {
    slang: SlangSolidityCompilerUserConfig;
  }

  export interface SlangSolidityCompilerConfig extends CommonSolidityCompilerConfig {
    type: "slang";
  }

  export interface SolidityCompilerConfigPerType {
    slang: SlangSolidityCompilerConfig;
  }

  export interface SlangSingleVersionSolidityUserConfig
    extends
      SlangSolidityCompilerUserConfig,
      CommonSingleVersionSolidityUserConfig {}

  export interface SingleVersionSolidityUserConfigPerType {
    slang: SlangSingleVersionSolidityUserConfig;
  }

  export interface SlangUserConfig {
    /**
     * Allow compiler type `"slang"` in the production build profile.
     * By default, `"slang"` in production is rejected as a safeguard.
     */
    dangerouslyAllowSlangInProduction?: boolean;
  }

  export interface SlangConfig {
    dangerouslyAllowSlangInProduction: boolean;
  }

  export interface HardhatUserConfig {
    slang?: SlangUserConfig;
  }

  export interface HardhatConfig {
    slang: SlangConfig;
  }
}
