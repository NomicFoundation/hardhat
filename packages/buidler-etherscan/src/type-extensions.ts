import { EtherscanConfig } from "./types";

declare module "@nomiclabs/buidler/types" {
  interface HardhatConfig {
    etherscan?: EtherscanConfig;
  }

  interface ResolvedHardhatConfig {
    etherscan: EtherscanConfig;
  }
}
