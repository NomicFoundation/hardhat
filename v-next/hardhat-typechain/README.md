# hardhat-typechain

This plugin integrates [TypeChain](https://github.com/dethcrypto/TypeChain) into Hardhat, automatically generating TypeScript bindings for your smart contracts.

## Installation

> This plugin is part of the [Ethers+Mocha Hardhat Toolbox](/v-next/hardhat-toolbox-mocha-ethers/). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-typechain
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import hardhatTypechain from "@nomicfoundation/hardhat-typechain";

export default {
  plugins: [hardhatTypechain],
};
```

## Usage

No extra steps are required to use this plugin. It will be run automatically by Hardhat when building your contracts.
