import { network } from "@ignored/hardhat-vnext";

// We connect to the default network (which can be controlled with `--network`),
// and use the `optimism` chain type.
const { ethers, networkConfig, networkName } = await network.connect(
  undefined,
  "optimism",
);

console.log("Sending transaction using network", networkName);

if (networkConfig.type === "edr") {
  console.log("Using an EDR network simulating Optimism, forking it");
  console.log(
    "Note: The forking initialization is not optimized yet, and the example RPC is slower than usual.",
  );
} else {
  console.log("Using an HTTP connection to Optimism");
}

const [sender] = await ethers.getSigners();

console.log("Sender:", await sender.address);

console.log(
  "Sender balance:",
  await ethers.provider.getBalance(sender.address),
);

console.log("Sending 1 wei from", sender.address, "to itself");

console.log("Sending L2 transaction");
const tx = await sender.sendTransaction({
  to: sender.address,
  value: 1n,
});

const receipt = (await tx.wait())!;

console.log(
  `Transaction included in block ${receipt.blockHash} (#${receipt.blockNumber})`,
);

if (networkName === "opSepolia") {
  console.log(
    `You can check your transaction on https://sepolia-optimism.etherscan.io/tx/${receipt.hash}`,
  );
}
