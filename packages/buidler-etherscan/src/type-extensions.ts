import { EtherscanConfig } from "./types";

declare module "hardhat/types" {
  interface HardhatConfig {
    etherscan?: EtherscanConfig;
  }

  interface ResolvedHardhatConfig {
    etherscan: EtherscanConfig;
  }
}
