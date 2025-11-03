# hardhat-viem

This plugin integrates [viem](https://viem.sh) into Hardhat, adding a `viem` object to each network connection.

## Installation

> This plugin is part of the [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-viem
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";

export default defineConfig({
  plugins: [hardhatViem],
});
```

## Usage

This plugin adds a `viem` property to each network connection:

```ts
import { network } from "hardhat";

const { viem } = await hre.network.connect();

const publicClient = await viem.getPublicClient();
console.log(await publicClient.getBlockNumber());

const counter = await viem.deployContract("Counter");
await counter.write.inc();
console.log(await counter.read.x());
```

To learn more about using viem with Hardhat, read [our guide](https://hardhat.org/docs/learn-more/using-viem).
