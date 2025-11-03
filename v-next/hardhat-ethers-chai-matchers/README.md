# hardhat-ethers-chai-matchers

This plugin adds Ethereum-specific matchers to the [Chai](https://chaijs.com/) assertion library that integrate with [ethers.js](https://ethers.org/), making your smart contract tests easy to write and read.

## Installation

> This plugin is part of the [Ethers+Mocha Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-mocha-ethers). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ethers-chai-matchers
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import { defineConfig } from "hardhat/config";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";

export default defineConfig({
  plugins: [hardhatEthersChaiMatchers],
});
```

## Usage

You don't need to do anything else to use this plugin. Whenever you run your tests with Hardhat, it will automatically add the matchers.

Here is an example of using the `emit` matcher:

```ts
import { expect } from "chai";

it("some test", async function () {
  const contract = await ethers.deployContract("SomeContract");

  await expect(contract.someFunction())
    .to.emit(contract, "SomeEvent")
    .withArgs("0x...", 3);
});
```
