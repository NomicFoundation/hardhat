import { SolcConfig } from "./builtin-tasks/compile";

export interface BuildConfig {
  paths: ProjectPathsConfig;
  solidity: SolidityConfig;
}

export interface ProjectPathsConfig {
  root: string;
  cache: string;
  artifacts: string;
  sources: string;
}

export interface SolidityConfig {
  compilers: SolcConfig[];
  overrides: Record<string, SolcConfig>;
}
