import chalk from "chalk";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import { EtherscanConfig } from "./types";

export async function etherscanConfigExtender(
  config: HardhatConfig,
  userConfig: Readonly<HardhatUserConfig>
): Promise<void> {
  const defaultConfig: EtherscanConfig = {
    apiKey: "",
    customChains: [],
  };

  if (userConfig.etherscan !== undefined) {
    const cloneDeep = (await import("lodash.clonedeep")).default;
    const customConfig = cloneDeep(userConfig.etherscan);

    config.etherscan = { ...defaultConfig, ...customConfig };
  } else {
    config.etherscan = defaultConfig;

    // check that there is no etherscan entry in the networks object, since
    // this is a common mistake done by users
    if (config.networks?.etherscan !== undefined) {
      console.warn(
        chalk.yellow(
          "WARNING: you have an 'etherscan' entry in your networks configuration. This is likely a mistake. The etherscan configuration should be at the root of the configuration, not within the networks object."
        )
      );
    }
  }
}
