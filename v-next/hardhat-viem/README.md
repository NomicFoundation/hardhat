# Hardhat Viem plugin

This plugin integrates [Viem](https://viem.sh) into Hardhat, adding a `viem` object to each network connection.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-viem@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import viemPlugin from "@nomicfoundation/hardhat-viem";

// ...

export default {
  // ...
  plugins: [
    // ...
    viemPlugin,
  ],

  // ...
};
```

## Usage

This plugin defines a new `viem` property to every `NetworkConnection` object.

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
