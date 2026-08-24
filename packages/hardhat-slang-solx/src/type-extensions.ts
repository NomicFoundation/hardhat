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
    // eslint-disable-next-line @typescript-eslint/naming-convention -- the compiler type discriminator is kebab-case to match the plugin name
    "slang-solx": true;
  }

  export interface SlangSolxSolidityCompilerUserConfig extends CommonSolidityCompilerUserConfig {
    type: "slang-solx";
  }

  export interface SolidityCompilerUserConfigPerType {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- the compiler type discriminator is kebab-case to match the plugin name
    "slang-solx": SlangSolxSolidityCompilerUserConfig;
  }

  export interface SlangSolxSolidityCompilerConfig extends CommonSolidityCompilerConfig {
    type: "slang-solx";
  }

  export interface SolidityCompilerConfigPerType {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- the compiler type discriminator is kebab-case to match the plugin name
    "slang-solx": SlangSolxSolidityCompilerConfig;
  }

  export interface SlangSolxSingleVersionSolidityUserConfig
    extends
      SlangSolxSolidityCompilerUserConfig,
      CommonSingleVersionSolidityUserConfig {}

  export interface SingleVersionSolidityUserConfigPerType {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- the compiler type discriminator is kebab-case to match the plugin name
    "slang-solx": SlangSolxSingleVersionSolidityUserConfig;
  }

  export interface SlangSolxUserConfig {
    /**
     * Allow compiler type `"slang-solx"` in the production build profile.
     * By default, `"slang-solx"` in production is rejected as a safeguard.
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
