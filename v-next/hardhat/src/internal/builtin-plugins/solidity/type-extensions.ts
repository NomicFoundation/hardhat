import type { SolidityCompilerConfig } from "../../../types/config.js";
import type {
  BuildOptions,
  CompilationJobCreationError,
  FileBuildResult,
  SolidityBuildSystem,
} from "../../../types/solidity/build-system.js";
import type {
  Compiler,
  CompilerInput,
  CompilerOutput,
} from "../../../types/solidity.js";

import "../../../types/config.js";
declare module "../../../types/config.js" {
  /**
   * An interface with a key per compiler type.
   * The types of the values don't matter; we use `true` as a convention.
   *
   * By default, only "solc" is provided. Plugins can extend this via
   * declaration merging to add new compiler types (e.g. "solx").
   */
  export interface SolidityCompilerTypeDefinitions {
    solc: true;
  }

  /**
   * The different Solidity compiler types, derived from
   * SolidityCompilerTypeDefinitions. Extensible via declaration merging.
   */
  export type SolidityCompilerType = keyof SolidityCompilerTypeDefinitions;

  /**
   * The type of `userConfig.solidity`.
   */
  export type SolidityUserConfig =
    | string
    | string[]
    | SingleVersionSolidityUserConfig
    | MultiVersionSolidityUserConfig
    | BuildProfilesSolidityUserConfig;

  /**
   * Fields that all the object-typed variants of SolidityUserConfig share.
   *
   * Note: All the variants of SolidityUserConfig except for the string and
   * array of strings MUST extend this interface. This is especially relevant
   * for plugins creating their own `SingleVersionSolidityUserConfig` variant.
   */
  export interface CommonSolidityUserConfig {
    isolated?: boolean;
    npmFilesToBuild?: string[];
  }

  /**
   * Fields that all the SolidityCompilerUserConfig variants share.
   *
   * Note: All the types of SolidityCompilerUserConfig MUST extend this
   * interface. This is especially relevant for plugins creating their own
   * `SolidityCompilerUserConfig` variant.
   */
  export interface CommonSolidityCompilerUserConfig {
    type?: SolidityCompilerType;
    version: string;
    settings?: any;
    path?: string;
  }

  /**
   * Deprecated: Use `SolcSolidityCompilerUserConfig` instead.
   * @deprecated
   */
  export interface SolcUserConfig extends CommonSolidityCompilerUserConfig {
    // Note: This field is optional for backwards compatibility. No `type` means
    // "solc" across all of Hardhat.
    type?: "solc";
    preferWasm?: boolean;
  }

  /**
   * Solc-specific SolidityCompilerUserConfig.
   */
  /* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Defined
    in SolcUserConfig for backwards compatibility */
  export interface SolcSolidityCompilerUserConfig extends SolcUserConfig {}

  /**
   * A map from compiler type to its SolidityCompilerUserConfig type.
   *
   * Note: The types MUST extend `CommonSolidityCompilerUserConfig`.
   */
  export interface SolidityCompilerUserConfigPerType {
    solc: SolcSolidityCompilerUserConfig;
  }

  /**
   * The type of all the compiler user configs.
   */
  export type SolidityCompilerUserConfig =
    | {
        [type in keyof SolidityCompilerUserConfigPerType]: SolidityCompilerUserConfigPerType[type];
      }[keyof SolidityCompilerUserConfigPerType]
    // SolcSolidityCompilerUserConfig when the type isn't present
    | (Omit<SolcSolidityCompilerUserConfig, "type"> &
        Partial<Pick<SolcSolidityCompilerUserConfig, "type">>);

  /**
   * Deprecated: Use `SolcSingleVersionSolidityUserConfig` instead.
   * @deprecated
   */
  export interface SingleVersionSolcUserConfig
    extends SolcSolidityCompilerUserConfig,
      CommonSolidityUserConfig {}

  /**
   * Solc-specific SingleVersionSolidityUserConfig.
   */
  /* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Defined
    in SingleVersionSolcUserConfig for backwards compatibility */
  export interface SolcSingleVersionSolidityUserConfig
    extends SingleVersionSolcUserConfig {}

  /**
   * A map from compiler type to its SingleVersionSolidityUserConfig type.
   *
   * Note: The types MUST extend `CommonSolidityUserConfig`.
   */
  export interface SingleVersionSolidityUserConfigPerType {
    solc: SolcSingleVersionSolidityUserConfig;
  }

  /**
   * The type of all the single version user configs.
   */
  export type SingleVersionSolidityUserConfig =
    | {
        [type in keyof SingleVersionSolidityUserConfigPerType]: SingleVersionSolidityUserConfigPerType[type];
      }[keyof SingleVersionSolidityUserConfigPerType]
    // SolcSingleVersionSolidityUserConfig when the type isn't present
    | (Omit<SolcSingleVersionSolidityUserConfig, "type"> &
        Partial<Pick<SolcSingleVersionSolidityUserConfig, "type">>);

  /**
   * Deprecated: Use `MultiVersionSolidityUserConfig` or
   * `MultiVersionBuildProfileUserConfig` instead.
   * @deprecated
   */
  export interface MultiVersionSolcUserConfig {
    // Note: preferWasm is here for backwards compatibility. It can't be
    // defined or not dependent on the type, as there isn't a top-level type.
    // Instead, we post-validate the resolved config to make sure that it's
    // only `true` if all the `compilers` and `overrides` have type `solc`.
    preferWasm?: boolean;
    // Note: Duplicated wrt CommonSolidityUserConfig for backwards compatibility
    isolated?: boolean;
    compilers: SolidityCompilerUserConfig[];
    overrides?: Record<string, SolidityCompilerUserConfig>;
  }

  /**
   * The type of a multi-version SolidityUserConfig.
   *
   * Partially defined in `MultiVersionSolcUserConfig` for backwards
   * compatibility.
   */
  export interface MultiVersionSolidityUserConfig
    extends MultiVersionSolcUserConfig,
      CommonSolidityUserConfig {}

  /**
   * The type of a single-version build profile user config.
   */
  export type SingleVersionBuildProfileUserConfig =
    SolidityCompilerUserConfig & {
      isolated?: boolean;
    };

  /**
   * The type of a multi-version build profile user config.
   */
  /* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Defined
    in `MultiVersionSolcUserConfig` for backwards compatibility. */
  export interface MultiVersionBuildProfileUserConfig
    extends MultiVersionSolcUserConfig {}

  /**
   * The type of the build profile version of the SolidityUserConfig.
   */
  export interface BuildProfilesSolidityUserConfig
    extends CommonSolidityUserConfig {
    profiles: Record<
      string,
      SingleVersionBuildProfileUserConfig | MultiVersionBuildProfileUserConfig
    >;
  }

  /**
   * Extension of HardhatUserConfig with the `solidity` property.
   */
  export interface HardhatUserConfig {
    solidity?: SolidityUserConfig;
  }

  /**
   * Common fields of a SolidityCompilerConfig.
   *
   * Note: All the types of SolidityCompiler config MUST extend this interface.
   * This is especially relevant for plugins creating their own
   * `SolidityCompilerConfig` variant.
   */
  export interface CommonSolidityCompilerConfig {
    type?: SolidityCompilerType;
    version: string;
    settings: any;
    path?: string;
  }

  /**
   * Deprecated: Use `SolcSolidityCompilerConfig` instead.
   * @deprecated
   */
  export interface SolcConfig extends CommonSolidityCompilerConfig {
    // Note: This field is optional for backwards compatibility. No `type` means
    // "solc" across all of Hardhat.
    type?: "solc";
    preferWasm?: boolean;
  }

  /**
   * The type of a solc-specific SolidityCompilerConfig.
   */
  /* eslint-disable-next-line @typescript-eslint/no-empty-interface -- Defined
    in SolcConfig for backwards compatibility */
  export interface SolcSolidityCompilerConfig extends SolcConfig {}

  /**
   * A map from compiler type to its `SolidityCompilerConfig` type. Note that
   * the types MUST extend `CommonSolidityCompilerConfig`.
   */
  export interface SolidityCompilerConfigPerType {
    solc: SolcSolidityCompilerConfig;
  }

  /**
   * The type of all the compiler configs.
   */
  export type SolidityCompilerConfig =
    | {
        [type in keyof SolidityCompilerConfigPerType]: SolidityCompilerConfigPerType[type] & {
          type: type;
        };
      }[keyof SolidityCompilerConfigPerType]
    | (Omit<SolcSolidityCompilerConfig, "type"> &
        Partial<Pick<SolcSolidityCompilerConfig, "type">>);

  /**
   * The type of a resolved build profile config.
   */
  export interface SolidityBuildProfileConfig {
    isolated: boolean;
    preferWasm: boolean;
    compilers: SolidityCompilerConfig[];
    overrides: Record<string, SolidityCompilerConfig>;
  }

  /**
   * Resolved Solidity config.
   */
  export interface SolidityConfig {
    profiles: Record<string, SolidityBuildProfileConfig>;
    npmFilesToBuild: string[];
    registeredCompilerTypes: SolidityCompilerType[];
  }

  /**
   * An extension of HardhatConfig with the `solidity` property.
   */
  export interface HardhatConfig {
    solidity: SolidityConfig;
  }

  export interface SourcePathsUserConfig {
    solidity?: string | string[];
  }

  export interface SourcePathsConfig {
    solidity: string[];
  }
}

import "../../../types/hre.js";
declare module "../../../types/hre.js" {
  export interface HardhatRuntimeEnvironment {
    solidity: SolidityBuildSystem;
  }
}

import "../../../types/global-options.js";
declare module "../../../types/global-options.js" {
  export interface GlobalOptions {
    buildProfile: string;
  }
}

import "../../../types/hooks.js";
declare module "../../../types/hooks.js" {
  export interface HardhatHooks {
    solidity: SolidityHooks;
  }

  export interface SolidityHooks {
    /**
     * Hook triggered to download compilers needed for compilation.
     * Each handler should download compilers it is responsible for.
     * Runs in parallel — all registered handlers execute concurrently.
     *
     * @param context The hook context.
     * @param compilerConfigs All compiler configurations from all build profiles.
     * @param quiet Whether to suppress download progress output.
     */
    downloadCompilers: (
      context: HookContext,
      compilerConfigs: SolidityCompilerConfig[],
      quiet: boolean,
    ) => Promise<void>;

    /**
     * Hook triggered during the cleanup process of Solidity compilation artifacts.
     * This hook runs after unused artifacts and build-info files have been removed.
     *
     * @param context The hook context.
     * @param artifactPaths The file paths of artifacts that remain after cleanup.
     * @param next A function to call the next handler for this hook, or the
     * default implementation if no more handlers exist.
     */
    onCleanUpArtifacts: (
      context: HookContext,
      artifactPaths: string[],
      next: (
        nextContext: HookContext,
        artifactPaths: string[],
      ) => Promise<void>,
    ) => Promise<void>;

    /**
     * Hook triggered to preprocess a Solidity file and manipulate its contents
     * before it is passed along for compilation. Only files directly under
     * the Hardhat project are preprocessed, Solidity files from npm
     * dependencies are not included.
     *
     * @param context The hook context.
     * @param inputSourceName The input source name of the project file.
     * @param fsPath The absolute path to the project file.
     * @param fileContent The content of the project file.
     * @param solcVersion The solc version that will be used to compile the project file.
     * @param next A function to call the next handler for this hook, or the
     * default implementation if no more handlers exist.
     *
     * @returns The modified file content.
     */
    preprocessProjectFileBeforeBuilding(
      context: HookContext,
      inputSourceName: string,
      fsPath: string,
      fileContent: string,
      solcVersion: string,
      next: (
        nextContext: HookContext,
        nextInputSourceName: string,
        nextFsPath: string,
        nextFileContent: string,
        nextSolcVersion: string,
      ) => Promise<string>,
    ): Promise<string>;

    /**
     * Hook triggered within the compilation job when its solc input is first constructed.
     *
     * @param context The hook context.
     * @param solcInput The solc input that will be passed to solc.
     * @param next A function to call the next handler for this hook, or the
     * default implementation if no more handlers exist.
     *
     * @returns The modified solc input.
     */
    preprocessSolcInputBeforeBuilding(
      context: HookContext,
      solcInput: CompilerInput,
      next: (
        nextContext: HookContext,
        nextSolcInput: CompilerInput,
      ) => Promise<CompilerInput>,
    ): Promise<CompilerInput>;

    readSourceFile: (
      context: HookContext,
      absolutePath: string,
      next: (
        nextContext: HookContext,
        nextAbsolutePath: string,
      ) => Promise<string>,
    ) => Promise<string>;

    /**
     * Hook triggered when a Solidity build process is run using the `build`
     * method of the Solidity build system.
     *
     * @param context The hook context.
     * @param rootFilePaths The files to build, which can be either absolute
     * paths or `npm:<package-name>/<file-path>` URIs.
     * @param options The options to use when building the files.
     * @param next A function to call the next handler for this hook.
     */
    build: (
      context: HookContext,
      rootFilePaths: string[],
      options: BuildOptions | undefined,
      next: (
        nextContext: HookContext,
        nextRootFilePaths: string[],
        nextOptions: BuildOptions | undefined,
      ) => Promise<CompilationJobCreationError | Map<string, FileBuildResult>>,
    ) => Promise<CompilationJobCreationError | Map<string, FileBuildResult>>;

    /**
     * Hook triggered to invoke a compiler on the standard-json input
     * generated for a given compilation job.
     * This hook allows for manipulating the input passed into the compiler
     * Hardhat has selected for the compilation job, and similarly to
     * manipulate the output.
     *
     * @param context The hook context.
     * @param compiler The compiler selected by Hardhat for this compilation
     * job.
     * @param solcInput The standard-json input constructed from the
     * compilation job.
     * @param solcConfig The compiler configuration (version, type, etc.).
     * @param next A function to call the next handler for this hook, or the
     * default implementation if no more handlers exist.
     */
    invokeSolc(
      context: HookContext,
      compiler: Compiler,
      solcInput: CompilerInput,
      solcConfig: SolidityCompilerConfig,
      next: (
        nextContext: HookContext,
        nextCompiler: Compiler,
        nextSolcInput: CompilerInput,
        nextSolcConfig: SolidityCompilerConfig,
      ) => Promise<CompilerOutput>,
    ): Promise<CompilerOutput>;

    /**
     * Provide a handler for this hook to supply remappings for npm packages.
     *
     * This hook is called when the resolver needs to read remappings for a package.
     * Handlers can provide remappings from alternative sources (e.g., foundry.toml)
     * in addition to the default remappings.txt files.
     *
     * @param context The hook context.
     * @param packageName The name of the npm package.
     * @param packageVersion The version of the npm package.
     * @param packagePath The absolute filesystem path to the package root.
     * @param next A function to get remappings from other sources (including default behavior).
     * @returns An array of remapping sources, each containing an array of remapping strings
     *   and the source path they came from.
     */
    readNpmPackageRemappings: (
      context: HookContext,
      packageName: string,
      packageVersion: string,
      packagePath: string,
      next: (
        nextContext: HookContext,
        nextPackageName: string,
        nextPackageVersion: string,
        nextPackagePath: string,
      ) => Promise<Array<{ remappings: string[]; source: string }>>,
    ) => Promise<Array<{ remappings: string[]; source: string }>>;
  }
}
