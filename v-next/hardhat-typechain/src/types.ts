export interface TypechainConfig {
  /**
   * The absolute path where the generated types should be stored.
   * Defaults to "types".
   */
  readonly outDir?: string;

  /**
   * Determines whether overloads with full signatures (e.g., deposit(uint256))
   * should always be generated, even if there are no overloads.
   * Defaults to false.
   */
  readonly alwaysGenerateOverloads: boolean;

  /**
   * Indicates whether TypeChain should be skipped during compilation.
   * If true, TypeChain will not be executed during the compilation process.
   * Defaults to false.
   */
  readonly dontOverrideCompile: boolean;

  /**
   * Generates basic union types for overloaded functions without adding extra
   * properties to help TypeScript identify specific cases.
   * Defaults to false.
   */
  readonly discriminateTypes: boolean;

  /**
   * Skips type-checking in the generated files.
   * Defaults to false.
   */
  readonly tsNocheck: boolean;
}

export type TypechainUserConfig = Partial<TypechainConfig>;
