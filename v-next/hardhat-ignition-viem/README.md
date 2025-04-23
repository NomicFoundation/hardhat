# Hardhat Ignition Viem plugin

This plugin integrates Hardhat Ignition with [viem](https://viem.sh) into Hardhat.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition-viem@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import ignitionViemPlugin from "@nomicfoundation/hardhat-ignition-viem";

// ...

export default {
  // ...
  plugins: [
    // ...
    ignitionViemPlugin,
  ],

  // ...
};
```

## Usage

This plugin defines a new `ignition` property on every `NetworkConnection` object, which allows you to deploy contracts using Hardhat Ignition, and returns a `viem` contract instance for each deployed contract.
