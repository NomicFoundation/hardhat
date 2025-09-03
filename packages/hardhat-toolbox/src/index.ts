import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ignition-ethers";
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

  if (userConfig.gasReporter?.enabled === undefined) {
    configAsAny.gasReporter.enabled = process.env.REPORT_GAS ? true : false;
  }

  // We don't generate types for js projects
  if (userConfig?.typechain?.dontOverrideCompile === undefined) {
    config.typechain.dontOverrideCompile =
      config.paths.configFile.endsWith(".js") ||
      config.paths.configFile.endsWith(".cjs");
  }
});
