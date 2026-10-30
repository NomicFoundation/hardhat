declare module "hardhat/types/solidity" {
  /**
   * The slang pipeline leaves `evm.{deployed,}Bytecode.sourceMap`
   * empty and emits source-mapping information as a hex-encoded ELF/DWARF blob in
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
     * The slang release to download and compile with. Every compiler entry
     * with `type: "slang"` and no custom `path` uses this one binary, and its
     * Solidity `version` must fall inside the release's supported range.
     *
     * Defaults to the latest release this plugin version records. Set it to stay
     * on a release across plugin upgrades.
     */
    version?: string;

    /**
     * Allow compiler type `"slang"` in the production build profile.
     * By default, `"slang"` in production is rejected as a safeguard.
     */
    dangerouslyAllowSlangInProduction?: boolean;
  }

  export interface SlangConfig {
    /**
     * The slang release to use: the one the user pinned, or the latest release
     * this plugin version records.
     */
    version: string;
    dangerouslyAllowSlangInProduction: boolean;
  }

  export interface HardhatUserConfig {
    slang?: SlangUserConfig;
  }

  export interface HardhatConfig {
    slang: SlangConfig;
  }
}
