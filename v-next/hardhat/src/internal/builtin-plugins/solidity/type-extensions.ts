import type {
  RunCompilationJobOptions,
  SolidityBuildSystem,
} from "../../../types/solidity/build-system.js";
import type {
  CompilationJob,
  CompilerOutput,
} from "../../../types/solidity.js";

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

  export interface MultiVersionSolcUserConfig {
    compilers: SolcUserConfig[];
    overrides?: Record<string, SolcUserConfig>;
  }

  export interface SingleVersionSolidityUserConfig extends SolcUserConfig {
    dependenciesToCompile?: string[];
    remappings?: string[];
  }

  export interface MultiVersionSolidityUserConfig
    extends MultiVersionSolcUserConfig {
    dependenciesToCompile?: string[];
    remappings?: string[];
  }

  export interface BuildProfilesSolidityUserConfig {
    profiles: Record<string, SolcUserConfig | MultiVersionSolcUserConfig>;
    dependenciesToCompile?: string[];
    remappings?: string[];
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
     * Provide a handler for this hook to customize how a compilation job is
     * run, or to run your custom logic right after a compilation job is run.
     *
     * @param context The hook context.
     * @param compilationJob The compilation job to run.
     * @param options The options to use when running the compilation job.
     * @param next A function to call the next handler for this hook, or the
     * default implementation if there are no more handlers.
     */
    runCompilationJob: (
      context: HookContext,
      compilationJob: CompilationJob,
      options: RunCompilationJobOptions,
      next: (
        nextContext: HookContext,
        nextCompilationJob: CompilationJob,
        nextOptions: RunCompilationJobOptions,
      ) => Promise<CompilerOutput>,
    ) => Promise<CompilerOutput>;
  }
}
