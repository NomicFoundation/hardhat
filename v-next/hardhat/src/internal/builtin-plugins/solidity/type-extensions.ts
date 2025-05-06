import type { SolidityBuildSystem } from "../../../types/solidity/build-system.js";

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
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface -- This could be an extension point
  export interface SingleVersionSolcUserConfig extends SolcUserConfig {}

  export interface MultiVersionSolcUserConfig {
    compilers: SolcUserConfig[];
    overrides?: Record<string, SolcUserConfig>;
  }

  export interface CommonSolidityUserConfig {
    dependenciesToCompile?: string[];
    remappings?: string[];
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
  }

  export interface SolidityBuildProfileConfig {
    compilers: SolcConfig[];
    overrides: Record<string, SolcConfig>;
  }

  export interface SolidityConfig {
    profiles: Record<string, SolidityBuildProfileConfig>;
    dependenciesToCompile: string[];
    remappings: string[];
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

    preprocessFileBeforeBuilding(
      context: HookContext,
      sourceName: string,
      fileContent: string,
      solcVersion: string,
      next: (
        nextContext: HookContext,
        nextSourceName: string,
        nextFileContent: string,
        nextSolcVersion: string,
      ) => Promise<string>,
    ): Promise<string>;

    preprocessSolcInputSourcesBeforeBuilding(
      context: HookContext,
      sources: Record<string, { content: string }>,
      next: (
        nextContext: HookContext,
        nextSources: Record<string, { content: string }>,
      ) => Promise<Record<string, { content: string }>>,
    ): Promise<Record<string, { content: string }>>;

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
