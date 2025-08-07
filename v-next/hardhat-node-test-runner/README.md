# hardhat-node-test-runner

This plugin integrates the native Node.js Test Runner (or [`node:test`](https://nodejs.org/docs/latest/api/test.html)) into Hardhat.

## Installation

> This plugin is part of the [Viem Hardhat Toolbox](/v-next/hardhat-toolbox-viem/). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-node-test-runner
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";

export default {
  plugins: [hardhatNodeTestRunner],
};
```

## Usage

This plugin defines a new task called `test nodejs` that runs your tests using `node:test`. This task gets executed automatically when running `npx hardhat test`.
