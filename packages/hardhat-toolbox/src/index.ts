import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

import { extendConfig } from "hardhat/config";

extendConfig((config, userConfig) => {
  const configAsAny = config as any;

  // hardhat-gas-reporter doesn't use extendConfig, so
  // config.gasReporter === userConfig.gasReporter
  // we use userConfig.gasReporter here for the types
  const gasReporterConfig = userConfig.gasReporter;

  configAsAny.gasReporter = gasReporterConfig ?? {};

  if (gasReporterConfig?.enabled === undefined) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    configAsAny.gasReporter.enabled = process.env.REPORT_GAS ? true : false;
  }

  if (gasReporterConfig?.currency === undefined) {
    configAsAny.gasReporter.currency = "USD";
  }
});
