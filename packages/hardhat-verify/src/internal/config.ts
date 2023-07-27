import type LodashCloneDeepT from "lodash.clonedeep";
import type { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import type { EtherscanConfig } from "../types";

import chalk from "chalk";

export function etherscanConfigExtender(
  config: HardhatConfig,
  userConfig: Readonly<HardhatUserConfig>
): void {
  const defaultConfig: EtherscanConfig = {
    apiKey: "",
    customChains: [],
  };

  if (userConfig.etherscan !== undefined) {
    const cloneDeep = require("lodash.clonedeep") as typeof LodashCloneDeepT;
    const customConfig = cloneDeep(userConfig.etherscan);

    config.etherscan = { ...defaultConfig, ...customConfig };
  } else {
    config.etherscan = defaultConfig;

    // check that there is no etherscan entry in the networks object, since
    // this is a common mistake made by users
    if (config.networks?.etherscan !== undefined) {
      console.warn(
        chalk.yellow(
          "WARNING: you have an 'etherscan' entry in your networks configuration. This is likely a mistake. The etherscan configuration should be at the root of the configuration, not within the networks object."
        )
      );
    }
  }
}
