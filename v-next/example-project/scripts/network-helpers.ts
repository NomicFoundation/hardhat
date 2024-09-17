/**
 * How to run this script:
 * 1) Start a Hardhat V2 node (until the V3 node is ready)
 * 3) Run this script with `npx hardhat run scripts/network-helpers.ts`.
 */

import hre from "@ignored/hardhat-vnext";
// Example on how to import load fixture
// import { loadFixture } from "@ignored/hardhat-vnext-network-helpers/load-fixture";

const { networkHelpers } = await hre.network.connect();

await networkHelpers.mine();
