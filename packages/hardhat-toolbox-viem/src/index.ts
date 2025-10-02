import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-ignition-viem";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "./internal/chai-setup";

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
    configAsAny.gasReporter.enabled =
      process.env.REPORT_GAS === "true" ? true : false;
  }
});
