# hardhat-viem

[Hardhat](https://hardhat.org) plugin for integration with [viem](https://viem.sh/).

### Usage

```ts
const { viem } = await hre.network.connect();

// public client
const publicClient = await networkConnection.viem.getPublicClient();
const balance = await publicClient.getBalance({
  address: "0x...",
});

// wallet client
const [walletClient1] = await networkConnection.viem.getWalletClients();
const hash = await walletClient1.sendTransaction({
  to: "0x...",
  value: "1000000000000000000",
});

// contracts
const counter = await viem.deployContract("Counter");
const x = await counter.read.x();
await counter.write.inc();
const xPlus1 = await counter.read.x();
```
