import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import hardhatIgnitionPlugin from "@ignored/hardhat-vnext-ignition";
import hardhatViemPlugin from "@ignored/hardhat-vnext-viem";

import { PLUGIN_ID } from "./internal/constants.js";

import "./type-extensions.js";

const hardhatIgnitionViemPlugin: HardhatPlugin = {
  id: PLUGIN_ID,
  npmPackage: "@ignored/hardhat-vnext-ignition-viem",
  dependencies: [
    async () => hardhatIgnitionPlugin,
    async () => hardhatViemPlugin,
  ],
  hookHandlers: {
    network: import.meta.resolve("./internal/hook-handlers/network.js"),
  },
};

export default hardhatIgnitionViemPlugin;

/**
 * Add an `ignition` object to the HRE.
 */
// extendEnvironment((hre) => {
//   if (
//     hre.ignition !== undefined &&
//     hre.ignition.type !== "stub" &&
//     hre.ignition.type !== "viem"
//   ) {
//     throw new HardhatPluginError(
//       "hardhat-ignition-viem",
//       `Found ${hre.ignition.type} and viem, but only one Hardhat Ignition extension plugin can be used at a time.`
//     );
//   }

//   hre.ignition = lazyObject(() => {
//     const { ViemIgnitionHelper } = require("./viem-ignition-helper");

//     return new ViemIgnitionHelper(hre);
//   });
// });
