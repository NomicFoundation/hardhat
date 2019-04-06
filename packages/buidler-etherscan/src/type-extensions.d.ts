import { EtherscanBuidlerEnvironment } from "./index";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    etherscan: EtherscanBuidlerEnvironment;
  }

  export interface BuidlerConfig {
    etherscan?: {
      url?: string;
      apiKey?: string;
    };
  }

  export interface SolcConfig {
    fullVersion: string;
  }
}
