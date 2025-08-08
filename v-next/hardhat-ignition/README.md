# hardhat-ignition

This plugin integrates [Hardhat Ignition](https://hardhat.org/ignition) into Hardhat.

## Installation

> This plugin is part of [Viem Hardhat Toolbox](/v-next/hardhat-toolbox-viem/) and [Ethers+Mocha Hardhat Toolbox](/v-next/hardhat-toolbox-mocha-ethers/). If you are using any of those toolboxes, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```typescript
import hardhatIgnition from "@nomicfoundation/hardhat-ignition";

export default {
  plugins: [hardhatIgnition],
};
```

## Usage

To learn more about how to use Hardhat Ignition, check out the [Hardhat Ignition documentation](https://hardhat.org/ignition).
