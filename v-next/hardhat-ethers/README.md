# Hardhat Ethers plugin

This plugin integrates [ethers.js](https://ethers.org/) into Hardhat, adding a `ethers` object to each network connection.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ethers@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import ethersPlugin from "@nomicfoundation/hardhat-ethers";

// ...

export default {
  // ...
  plugins: [
    // ...
    ethersPlugin,
  ],

  // ...
};
```

## Usage

This plugin defines a new `ethers` property to every `NetworkConnection` object.

```ts
const { ethers } = await hre.network.connect();

// ethers functionality is available
ethers.isAddress("0x1234567890123456789012345678901234567890");

// ethers.provider gives you access to the underlying provider
const blockNumber = await ethers.provider.getBlockNumber();

// hardhat-ethers helper methods are available
const signers = await ethers.getSigners();
const Counter = await ethers.getContractFactory("Counter");
```
