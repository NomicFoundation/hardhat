import type { SolidityBuildSystem } from "../../../types/solidity/build-system.js";
import type { CompilerInput } from "../../../types/solidity.js";

import "../../../types/config.js";
declare module "../../../types/config.js" {
  export type SolidityUserConfig =
    | string
    | string[]
    | SingleVersionSolidityUserConfig
    | MultiVersionSolidityUserConfig
    | BuildProfilesSolidityUserConfig;

  export interface SolcUserConfig {
    version: string;
    settings?: any;
    path?: string;
  }

  export interface SingleVersionSolcUserConfig extends SolcUserConfig {
    isolated?: boolean;
    preferWasm?: boolean;
  }

  export interface MultiVersionSolcUserConfig {
    isolated?: boolean;
    preferWasm?: boolean;
    compilers: SolcUserConfig[];
    overrides?: Record<string, SolcUserConfig>;
  }

  export interface CommonSolidityUserConfig {
    npmFilesToBuild?: string[];
  }

  export interface SingleVersionSolidityUserConfig
    extends SingleVersionSolcUserConfig,
      CommonSolidityUserConfig {}

  export interface MultiVersionSolidityUserConfig
    extends MultiVersionSolcUserConfig,
      CommonSolidityUserConfig {}

  export interface BuildProfilesSolidityUserConfig
    extends CommonSolidityUserConfig {
    profiles: Record<
      string,
      SingleVersionSolcUserConfig | MultiVersionSolcUserConfig
    >;
  }

  export interface HardhatUserConfig {
    solidity?: SolidityUserConfig;
  }

  export interface SolcConfig {
    version: string;
    settings: any;
    path?: string;
  }

  export interface SolidityBuildProfileConfig {
    isolated: boolean;
    preferWasm: boolean;
    compilers: SolcConfig[];
    overrides: Record<string, SolcConfig>;
  }

  export interface SolidityConfig {
    profiles: Record<string, SolidityBuildProfileConfig>;
    npmFilesToBuild: string[];
  }

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
     * Hook triggered within the compilation job when its' solc input is first constructed.
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
     * Hook triggered within the compilation job when its' solc input is first constructed.
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
  }
}
