# Hardhat Ignition Ethers plugin

This plugin integrates Hardhat Ignition with [ethers.js](https://ethers.org/) into Hardhat.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition-ethers@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import ignitionEthersPlugin from "@nomicfoundation/hardhat-ignition-ethers";

// ...

export default {
  // ...
  plugins: [
    // ...
    ignitionEthersPlugin,
  ],

  // ...
};
```

## Usage

This plugin defines a new `ignition` property on every `NetworkConnection` object, which allows you to deploy contracts using Hardhat Ignition, and returns an `ethers` contract instance for each deployed contract.
