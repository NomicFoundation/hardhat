import { EtherscanConfig } from "./types";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerConfig {
    etherscan?: EtherscanConfig;
  }

  interface SolcConfig {
    fullVersion: string;
  }
}
