import type LodashT from "lodash";

import chalk from "chalk";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { ConfigExtender } from "hardhat/types";
import { chainConfig } from "./ChainConfig";
import { EtherscanConfig } from "./types";
import { pluginName } from "./constants";

export const verifyAllowedChains = (etherscanConfig: EtherscanConfig) => {
  if (
    etherscanConfig.apiKey === null ||
    etherscanConfig.apiKey === undefined ||
    typeof etherscanConfig.apiKey !== "object"
  ) {
    return;
  }

  // check if any of the configured api keys is for an unsupported network
  const builtinChains = Object.keys(chainConfig);
  const customChains = etherscanConfig.customChains.map((x) => x.network);
  const allowedChains = [...builtinChains, ...customChains];

  const actual = Object.keys(etherscanConfig.apiKey);

  const invalidNetwork = actual.find((chain) => !allowedChains.includes(chain));

  if (invalidNetwork !== undefined) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `You set an Etherscan API token for the network "${invalidNetwork}" but the plugin doesn't support it, or it's spelled incorrectly.

To see the list of supported networks, run this command:

  npx hardhat verify --list-networks

Learn more at https://hardhat.org/verify-multiple-networks`
    );
  }
};

export const etherscanConfigExtender: ConfigExtender = (
  resolvedConfig,
  config
) => {
  const defaultConfig = {
    apiKey: "",
    customChains: [],
  };

  if (config.etherscan !== undefined) {
    const { cloneDeep } = require("lodash") as typeof LodashT;
    const customConfig = cloneDeep(config.etherscan);

    resolvedConfig.etherscan = { ...defaultConfig, ...customConfig };
  } else {
    resolvedConfig.etherscan = defaultConfig;

    // check that there is no etherscan entry in the networks object, since
    // this is a common mistake done by users
    if (resolvedConfig.networks?.etherscan !== undefined) {
      console.warn(
        chalk.yellow(
          `WARNING: you have an 'etherscan' entry in your networks configuration. This is likely a mistake. The etherscan configuration should be at the root of the configuration, not within the networks object.`
        )
      );
    }
  }
};
