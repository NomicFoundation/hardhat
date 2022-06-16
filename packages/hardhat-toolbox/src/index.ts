import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
/**
 * If a new official plugin is added, make sure to update:
 *   - The tsconfig.json file
 *   - The hardhat-toolbox GitHub workflow
 *   - The parts of the documentation that install hardhat-toolbox with npm 6 or yarn
 *   - The list of dependencies that the sample projects install
 *   - The README
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

  // We don't generate types for js projects
  if (userConfig?.typechain?.dontOverrideCompile === undefined) {
    config.typechain.dontOverrideCompile =
      config.paths.configFile.endsWith(".js");
  }
});
