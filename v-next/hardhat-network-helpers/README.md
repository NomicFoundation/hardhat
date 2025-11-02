# hardhat-network-helpers

Hardhat Network Helpers is a plugin that provides a set of utility functions to interact with locally simulated networks.

## Installation

> This plugin is part of [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem) and [Ethers+Mocha Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-mocha-ethers). If you are using any of those toolboxes, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-network-helpers
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import { defineConfig } from "hardhat/config";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

export default defineConfig({
  plugins: [hardhatNetworkHelpers],
});
```

### Usage

This plugin adds a `networkHelpers` property to each network connection:

```ts
import { network } from "hardhat";

const { networkHelpers } = await network.connect();

// immediately mine a new block
await networkHelpers.mine();

// mines a new block whose timestamp is 60 seconds after the latest block's timestamp.
await networkHelpers.time.increase(60);
```

Check [the network helpers docs](https://hardhat.org/hardhat-network-helpers) to learn more.
