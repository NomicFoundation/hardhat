import { SolcConfig } from "./builtin-tasks/compile";

export interface HardhatConfig {
  // defaultNetwork: string;
  paths: ProjectPathsConfig;
  // networks: NetworksConfig;
  solidity: SolidityConfig;
  // mocha: Mocha.MochaOptions;
}

export interface ProjectPathsConfig {
  root: string;
  configFile: string;
  cache: string;
  artifacts: string;
  sources: string;
  tests: string;
}

export interface SolidityConfig {
  compilers: SolcConfig[];
  overrides: Record<string, SolcConfig>;
}

export interface ProjectPathsConfig {
  root: string;
  configFile: string;
  cache: string;
  artifacts: string;
  sources: string;
  tests: string;
}
