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

  export type SolidityTestUserConfig = RunOptions &
    Omit<SolidityTestRunnerConfigArgs, "projectRoot">;

  export interface SingleVersionSolcUserConfig extends SolcUserConfig {
    test?: SolidityTestUserConfig;
  }

  export interface MultiVersionSolcUserConfig {
    compilers: SolcUserConfig[];
    overrides?: Record<string, SolcUserConfig>;
    test?: SolidityTestUserConfig;
  }

  export interface SingleVersionSolidityUserConfig
    extends SingleVersionSolcUserConfig {
    dependenciesToCompile?: string[];
    remappings?: string[];
  }

  export interface MultiVersionSolidityUserConfig
    extends MultiVersionSolcUserConfig {
    dependenciesToCompile?: string[];
    remappings?: string[];
  }

  export interface BuildProfilesSolidityUserConfig {
    profiles: Record<
      string,
      SingleVersionSolcUserConfig | MultiVersionSolcUserConfig
    >;
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

  export type SolidityTestConfig = RunOptions &
    Omit<SolidityTestRunnerConfigArgs, "projectRoot">;

  export interface SolidityBuildProfileConfig {
    compilers: SolcConfig[];
    overrides: Record<string, SolcConfig>;
    test: SolidityTestConfig;
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
import type { SolidityBuildSystem } from "../../../types/solidity/build-system.js";
import type { RunOptions } from "../solidity-test/types.js";
import type { SolidityTestRunnerConfigArgs } from "@ignored/edr";

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
