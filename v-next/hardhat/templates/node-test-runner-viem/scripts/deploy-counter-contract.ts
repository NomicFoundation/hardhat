import { network } from "@ignored/hardhat-vnext";

console.log("Deploying a contract into a local fork of Optimism");
const { viem } = await network.connect("edrOp", "optimism");

const counter = await viem.deployContract("Counter");

console.log("Counter contract address:", await counter.address);
