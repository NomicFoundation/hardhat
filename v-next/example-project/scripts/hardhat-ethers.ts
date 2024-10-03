/**
 * How to run this script:
 * 1) Start a Hardhat V2 node (until the V3 node is ready)
 * 3) Run this script with `npx hardhat run scripts/hardhat-ethers.ts`.
 */

import hre from "@ignored/hardhat-vnext";

const { ethers } = await hre.network.connect();

// ethers functionalities
ethers.isAddress("0x1234567890123456789012345678901234567890");

// ethers.Provider
await ethers.provider.getBlockNumber();

// Hardhat helper methods
await ethers.getSigners();
