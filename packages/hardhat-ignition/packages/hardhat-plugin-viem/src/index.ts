import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-viem";
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
    hre.ignition.type !== "viem"
  ) {
    throw new HardhatPluginError(
      "hardhat-ignition-viem",
      `Found ${hre.ignition.type} and viem, but only one Hardhat Ignition extension plugin can be used at a time.`
    );
  }

  hre.ignition = lazyObject(() => {
    const { ViemIgnitionHelper } = require("./viem-ignition-helper");

    return new ViemIgnitionHelper(hre);
  });
});
