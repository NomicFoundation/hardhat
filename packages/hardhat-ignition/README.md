# hardhat-ignition

This plugin integrates [Hardhat Ignition](https://hardhat.org/ignition) into Hardhat.

## Installation

> This plugin is part of [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem) and [Ethers+Mocha Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-mocha-ethers). If you are using any of those toolboxes, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatIgnition from "@nomicfoundation/hardhat-ignition";

export default defineConfig({
  plugins: [hardhatIgnition],
});
```

## Usage

To learn more about how to use Hardhat Ignition, check out the [Hardhat Ignition documentation](https://hardhat.org/ignition).

### Limiting deployment batch size

To limit the number of futures executed in each deployment batch, set `ignition.maxBatchSize` in your Hardhat configuration:

```typescript
export default defineConfig({
  plugins: [hardhatIgnition],
  ignition: {
    maxBatchSize: 10,
  },
});
```

The value must be a positive safe integer. When omitted, Ignition keeps its existing dependency-based batches without a size limit. Each batch must finish successfully, including the required transaction confirmations, before the next batch starts. Splitting a batch preserves the boundaries between the original dependency batches.

This limit counts futures, including operations that do not send transactions. When resuming a deployment, Ignition processes pending nonces before assigning new ones within each dependency batch. Reducing the limit does not cancel transactions that a previous run already submitted.
