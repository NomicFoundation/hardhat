import { network } from "hardhat";
const { ethers } = await network.connect();

console.log("\n\n\n");
console.log("Contract deployment:");

const counter = await ethers.deployContract("Counter");

console.log("\n\n\n");
console.log("Read:");

await counter.x();

console.log("\n\n\n");
console.log("Write:");
await counter.incBy(1n);

console.log("\n\n\n");
console.log("Get sender:");

const [sender] = await ethers.getSigners();

console.log("\n\n\n");
console.log("Value transfer from sender:");

const amount = 1n;

await sender.sendTransaction({
  to: sender.address,
  value: amount,
});

console.log("\n\n\n");
console.log("Estimate gas for contract function shouldn't be affected:");
await counter.incBy.estimateGas(1n);

console.log("\n\n\n");
console.log("Gas estimate for value transfer shouldn't be affected:");
await sender.estimateGas({
  to: sender.address,
  value: amount,
});
