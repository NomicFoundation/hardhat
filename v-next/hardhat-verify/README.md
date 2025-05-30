# Hardhat Verify plugin

[Hardhat](https://hardhat.org) plugin to verify the source of code of deployed contracts.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-verify@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import hardhatVerifyPlugin from "@nomicfoundation/hardhat-verify";

// ...

export default {
  // ...
  plugins: [
    // ...
    hardhatVerifyPlugin,
  ],

  // ...
};
```

## Usage

### Verifying on Etherscan

You need to add the following Etherscan config in your `hardhat.config.ts` file

```typescript
import { configVariable } from "hardhat/config";

export default {
  // ...
  verify: {
    etherscan: {
      // Your API key for Etherscan
      // Obtain one at https://etherscan.io/
      apiKey: "<ETHERSCAN_API_KEY>",
    },
  },
};
```

Run the `verify` task, passing the address of the contract, the network where it's deployed, and the constructor arguments that were used to deploy it (if any):

```bash
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```

## How it works

The plugin works by fetching the bytecode in the given address and using it to check which contract in your project corresponds to it. Besides that, some sanity checks are performed locally to make sure that the verification won't fail.
