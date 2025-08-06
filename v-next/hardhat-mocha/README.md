# hardhat-mocha

This plugin integrates [Mocha](https://mochajs.org/) into Hardhat.

## Installation

> This plugin is part of the [Ethers+Mocha Hardhat Toolbox](/v-next/hardhat-toolbox-mocha-ethers/). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-mocha
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import hardhatMocha from "@nomicfoundation/hardhat-mocha";

export default {
  plugins: [hardhatMocha],
};
```

## Usage

This plugin defines a new task called `test mocha` that runs your tests using Mocha. This task gets executed automatically when running `npx hardhat test`.

### Configuration

You can use the `test.mocha` entry in the Hardhat configuration to customize the Mocha options. For example:

```ts
export default {
  test: {
    mocha: {
      timeout: 20_000, // set the timeout for tests to 20 seconds
    },
  },
};
```
