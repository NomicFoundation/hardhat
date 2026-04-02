import { network } from "hardhat";

async function sendL2Transaction(networkConfigName: string) {
  console.log("Sending transaction using network", networkConfigName);

  const { viem, networkConfig } = await network.connect({
    network: networkConfigName,
    chainType: "op",
  });

  if (networkConfig.type === "edr-simulated") {
    console.log("Using an EDR network simulating Optimism, forking it");
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

  console.log("Transaction receipt:", receipt);
}

await sendL2Transaction("opSepolia");
console.log("");
console.log("");
console.log("");
await sendL2Transaction("edrOpSepolia");
