import { network } from "@ignored/hardhat-vnext";

// We connect to the default network (which can be controlled with `--network`),
// and use the `optimism` chain type, so that we get the right viem extensions.
const { viem, networkConfig, networkName } = await network.connect(
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

const publicClient = await viem.getPublicClient();
const [senderClient] = await viem.getWalletClients();

console.log("Sender:", await senderClient.account.address);

console.log(
  "Sender balance:",
  await publicClient.getBalance(senderClient.account),
);

console.log("Sending 1 wei from", senderClient.account.address, "to itself");

console.log("Estimating L1 gas first");
const l1Gas = await publicClient.estimateL1Gas({
  account: senderClient.account.address,
  to: senderClient.account.address,
  value: 1n,
});

console.log("Estimated L1 gas:", l1Gas);

console.log("Sending L2 transaction");
const tx = await senderClient.sendTransaction({
  to: senderClient.account.address,
  value: 1n,
});

const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

console.log(
  `Transaction included in block ${receipt.blockHash} (#${receipt.blockNumber})`,
);

if (networkName === "opSepolia") {
  console.log(
    `You can check your transaction on https://sepolia-optimism.etherscan.io/tx/${tx}`,
  );
}
