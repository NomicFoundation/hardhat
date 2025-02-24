import type { SolidityBuildSystem } from "../../../types/solidity/build-system.js";
import type { CompilationJob } from "../../../types/solidity.js";

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

  export interface CommonSolcUserConfig {
    mergeCompilationJobs?: boolean;
    concurrency?: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface -- This could be an extension point
  export interface SingleVersionSolcUserConfig
    extends SolcUserConfig,
      CommonSolcUserConfig {}

  export interface MultiVersionSolcUserConfig extends CommonSolcUserConfig {
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

  export type SolidityBuildProfileUserConfig =
    | SingleVersionSolcUserConfig
    | MultiVersionSolcUserConfig;

  export interface BuildProfilesSolidityUserConfig
    extends CommonSolidityUserConfig {
    profiles: Record<string, SolidityBuildProfileUserConfig>;
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
    mergeCompilationJobs?: boolean;
    concurrency?: number;
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
     * Provide a handler for this hook to retrieve all artifacts created by a compilation job.
     *
     * @param context The hook context.
     * @param artifacts A map of the artifacts created by each compilation job.
     * @param next A function to call the next handler for this hook, or the
     * default implementation if there are no more handlers.
     */
    onAllArtifactsEmitted: (
      context: HookContext,
      artifacts: Map<CompilationJob, ReadonlyMap<string, string[]>>,
      next: (
        nextContext: HookContext,
        artifacts: Map<CompilationJob, ReadonlyMap<string, string[]>>,
      ) => Promise<void>,
    ) => Promise<void>;
  }
}
