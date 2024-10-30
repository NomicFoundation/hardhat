import { network } from "@ignored/hardhat-vnext";

console.log("Deploying a contract into a local fork of Optimism");
const { ethers } = await network.connect("edrOp", "optimism");

const counter = await ethers.deployContract("Counter");

console.log("Counter contract address:", await counter.getAddress());
