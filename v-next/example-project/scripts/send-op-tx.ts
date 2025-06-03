import { network } from "hardhat";

const { provider } = await network.connect({
  network: "op",
  chainType: "optimism",
});

const accounts = (await provider.request({
  method: "eth_accounts",
})) as string[];

console.log("Accounts:", accounts);

const sender = accounts[0];

console.log("Sender:", sender);

console.log(
  "Sender balance: ",
  (await provider.request({
    method: "eth_getBalance",
    params: [sender, "latest"],
  })) as string,
);

console.log("Sending 1 gwei from", sender, "to", sender);

const tx = await provider.request({
  method: "eth_sendTransaction",
  params: [
    {
      from: sender,
      to: sender,
      value: "0x1",
    },
  ],
});

console.log("Transaction hash:", tx);

while (true) {
  console.log("Waiting for transaction to be mined...");
  const receipt = await provider.request({
    method: "eth_getTransactionReceipt",
    params: [tx],
  });

  if (receipt === null) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    continue;
  }

  console.log("Transaction receipt:", receipt);
  break;
}
