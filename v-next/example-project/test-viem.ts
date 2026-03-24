import { network } from "hardhat";
const { viem } = await network.connect();

console.log("\n\n\n");
console.log("Contract deployment:");

const counter = await viem.deployContract("Counter");

console.log("\n\n\n");
console.log("Read:");

await counter.read.x();

console.log("\n\n\n");
console.log("Write:");
await counter.write.incBy([1n]);

console.log("\n\n\n");
console.log("Get sender:");

const [sender] = await viem.getWalletClients();

console.log("\n\n\n");
console.log("Value transfer:");

const amount = 1n;

await sender.sendTransaction({
  to: sender.account.address,
  value: amount,
});

console.log("\n\n\n");
console.log("Estimate gas for contract function shouldn't be affected:");
await counter.estimateGas.incBy([1n]);

console.log("\n\n\n");
console.log("Prepare transaction request shouldn't be affected:");
await sender.prepareTransactionRequest({
  to: sender.account.address,
  value: amount,
});

console.log("\n\n\n");
console.log("Public client estimation shouldn't be affected:");
const publicClient = await viem.getPublicClient();
await publicClient.estimateGas({
  to: sender.account.address,
  value: amount,
});
