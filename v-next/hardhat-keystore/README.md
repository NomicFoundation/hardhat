# hardhat-keystore

This plugin adds an encrypted keystore to Hardhat, to handle secret values (e.g. API keys and private keys) in your config securely.

## Installation

> This plugin is part of [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem) and [Ethers+Mocha Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-mocha-ethers). If you are using any of those toolboxes, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-keystore
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";

export default {
  plugins: [hardhatKeystore],
};
```

## Usage

Check [our guide to configuration variables](https://hardhat.org/docs/learn-more/configuration-variables) to learn how to use the keystore in your Hardhat configuration.
