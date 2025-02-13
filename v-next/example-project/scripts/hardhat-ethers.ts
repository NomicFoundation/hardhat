/**
 * How to run this script:
 * run this script with `npx hardhat run scripts/hardhat-ethers.ts`.
 */

import hre from "@ignored/hardhat-vnext";

const { ethers } = await hre.network.connect();

// ethers functionalities
ethers.isAddress("0x1234567890123456789012345678901234567890");

// ethers.Provider
await ethers.provider.getBlockNumber();

// Hardhat helper methods
await ethers.getSigners();
