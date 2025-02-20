# Hardhat Ethers Chai Matchers

This plugin adds Ethereum-specific matchers to the [Chai](https://chaijs.com/) assertion library that integrate with [ethers.js](https://ethers.org/), making your smart contract tests easy to write and read.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ethers-chai-matchers@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import ethersChaiMatchersPlugin from "@nomicfoundation/hardhat-ethers-chai-matchers";

// ...

export default {
  // ...
  plugins: [
    // ...
    ethersChaiMatchersPlugin,
  ],

  // ...
};
```

## Usage

You don't need to do anything else to use this plugins. Whenever you run your tests with Hardhat, it will automatically add the matchers.
