# hardhat-ignition-ethers

This plugin integrates [Hardhat Ignition](https://hardhat.org/ignition) with [ethers.js](https://ethers.org/).

## Installation

> This plugin is part of the [Ethers+Mocha Hardhat Toolbox](/v-next/hardhat-toolbox-mocha-ethers/). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition-ethers
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import hardhatIgnitionEthers from "@nomicfoundation/hardhat-ignition-ethers";

export default {
  plugins: [hardhatIgnitionEthers],
};
```

## Usage

This plugin adds an `ignition` property to each network connection:

```ts
import { network } from "hardhat";
import Counter from "../ignition/modules/Counter.js";

const { ignition } = await network.connect();
const { counter } = await ignition.deploy(Counter);

await counter.inc();
console.log(await counter.x());
```

The `ignition` object has a `deploy` method that can be used to deploy Ignition modules. This returns an ethers contract instance for each contract returned by the module.
