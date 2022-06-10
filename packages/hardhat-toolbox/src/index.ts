import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
/**
 * If a new official plugin is added, make sure that the tsconfig.json file and
 * the hardhat-toolbox workflow are updated. The parts of the documentation that
 * install hardhat-toolbox with npm 6 or yarn must also be updated. Finally, update
 * the list of dependencies that the sample projects install.
 */

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
