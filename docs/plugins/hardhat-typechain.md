---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/rhlsthrm/hardhat-typechain/tree/master)
:::

# Announcement

This project has been absorbed into the mainline Typechain package! Please see this repo for info: https://github.com/ethereum-ts/TypeChain/tree/master/packages/hardhat. The new package can be installed as `@typechain/hardhat`, all other usage is fully backwards compatible!

# hardhat-typechain

_Zero-config Typechain support_

_Updated for Hardhat!_

_Now supports Ethers v5 and Truffle v5!_

_Updated for TypeChain v3!_

Add [Typechain](https://www.github.com/ethereum-ts/TypeChain) tasks to your hardhat project!

## What

[TypeChain](https://www.github.com/ethereum-ts/TypeChain) gives you Typescript bindings for your smart contracts. Now, your tests and frontend code can be typesafe and magically autocomplete smart contract function names!

## Installation

```bash
npm i hardhat-typechain typechain ts-generator
# choose plugin for required target, only need to install one of these
npm i @typechain/ethers-v5 @typechain/truffle-v5 @typechain/web3-v1
```

And add the following statement to your `hardhat.config.js`:

```js
require("hardhat-typechain");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "hardhat-typechain";
```

## Zero Config Usage

Run the _compile_ task as normal, and Typechain artifacts will automatically be generated in a root directory called `typechain`. Further configuration options are detailed below.

## Tasks

This plugin overrides the _compile_ task and automatically generates new Typechain artifacts on each compilation.

There is an optional flag `--no-typechain` which can be passed in to skip Typechain compilation.

This plugin adds the _typechain_ task to hardhat:

```
Generate Typechain typings for compiled contracts
```

## Configuration

This plugin extends the `hardhatConfig` optional `typechain` object. The object contains two fields, `outDir` and `target`. `outDir` is the output directory of the artifacts that TypeChain creates (defaults to `typechain`). `target` is one of the targets specified by the TypeChain [docs](https://github.com/ethereum-ts/TypeChain#cli) (defaults to `ethers`).

This is an example of how to set it:

```js
module.exports = {
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
};
```

## Usage

`npx hardhat compile` - Compiles and generates Typescript typings for your contracts.

Example Waffle + Ethers test that uses typedefs for contracts:

```ts
import { ethers, waffle } from "@nomiclabs/hardhat";
import chai from "chai";
import { Wallet } from "ethers";

import CounterArtifact from "../artifacts/Counter.json";
import { Counter } from "../typechain/Counter";

const { deployContract } = waffle;
const { expect } = chai;

describe("Counter", () => {
  let counter: Counter;

  beforeEach(async () => {
    // 1
    const signers = await ethers.signers();

    // 2
    counter = (await deployContract(
      <Wallet>signers[0],
      CounterArtifact
    )) as Counter;
    const initialCount = await counter.getCount();

    // 3
    expect(initialCount).to.eq(0);
    expect(counter.address).to.properAddress;
  });

  // 4
  describe("count up", async () => {
    it("should count up", async () => {
      await counter.countUp();
      let count = await counter.getCount();
      expect(count).to.eq(1);
    });
  });

  describe("count down", async () => {
    // 5
    it("should fail", async () => {
      await counter.countDown();
    });

    it("should count down", async () => {
      await counter.countUp();

      await counter.countDown();
      const count = await counter.getCount();
      expect(count).to.eq(0);
    });
  });
});
```

See this [starter kit](https://github.com/rhlsthrm/typescript-solidity-dev-starter-kit) for a full example!
