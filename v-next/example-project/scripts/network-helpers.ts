/**
 * How to run this script:
 * Run this script with `npx hardhat run scripts/network-helpers.ts`.
 */

import hre from "@ignored/hardhat-vnext";

const { networkHelpers } = await hre.network.connect();

await networkHelpers.mine();
