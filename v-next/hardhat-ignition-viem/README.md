# hardhat-ignition-viem

This plugin integrates [Hardhat Ignition](https://hardhat.org/ignition) with [viem](https://viem.sh).

## Installation

> This plugin is part of the [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition-viem
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import { defineConfig } from "hardhat/config";
import hardhatIgnitionViem from "@nomicfoundation/hardhat-ignition-viem";

export default defineConfig({
  plugins: [hardhatIgnitionViem],
});
```

## Usage

This plugin adds an `ignition` property to each network connection:

```ts
import { network } from "hardhat";
import Counter from "../ignition/modules/Counter.js";

const { ignition } = await network.connect();
const { counter } = await ignition.deploy(Counter);

await counter.write.inc();
console.log(await counter.read.x());
```

The `ignition` object has a `deploy` method that can be used to deploy Ignition modules. This returns a **type-safe** viem contract instance for each contract returned by the module.
