import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ignition";
import { extendEnvironment } from "hardhat/config";
import { HardhatPluginError, lazyObject } from "hardhat/plugins";

import "./type-extensions";

/**
 * Add an `ignition` object to the HRE.
 */
extendEnvironment((hre) => {
  if (
    hre.ignition !== undefined &&
    hre.ignition.type !== "stub" &&
    hre.ignition.type !== "ethers"
  ) {
    throw new HardhatPluginError(
      "hardhat-ignition-ethers",
      `Found ${hre.ignition.type} and ethers, but only one Hardhat Ignition extension plugin can be used at a time.`
    );
  }

  hre.ignition = lazyObject(() => {
    const { EthersIgnitionHelper } = require("./ethers-ignition-helper");

    return new EthersIgnitionHelper(hre);
  });
});
