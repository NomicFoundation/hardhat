import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// chai matchers should be available
expect("0x0000010AB").to.not.hexEqual("0x0010abc");

// ethers should be available
await ethers.getSigners();

// network helpers should be available
await networkHelpers.mine();
