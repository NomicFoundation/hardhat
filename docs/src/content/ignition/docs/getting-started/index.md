---
title: Getting started with Hardhat Ignition
description: Getting started with Hardhat Ignition, a declarative smart contract deployment system.
---

## Overview

Hardhat Ignition is a [declarative](https://en.wikipedia.org/wiki/Declarative_programming) system for deploying smart contracts on Ethereum. It enables you to define smart contract instances you want to deploy, and any operation you want to run on them. By taking over the deployment and execution, Hardhat Ignition lets you focus on your project instead of getting caught up in the deployment details.

In Hardhat Ignition, deployments are defined through Ignition Modules. These modules serve as abstractions, helping you outline and describe the system that you want to deploy. Each Ignition Module encapsulates a group of smart contract instances and operations within your system.

You can think of Ignition Modules as being conceptually similar to JavaScript modules. In JavaScript, you create a module to group definitions of functions, classes, and values, and then you export some of them. In Hardhat Ignition, you create a module where you group definitions of smart contract instances and operations, and you export some of those contracts.

Creating a module doesn't lead to an interaction with the Ethereum network. After your modules are defined, then you can ask Hardhat Ignition to deploy them.

This declarative approach provides Hardhat Ignition with the autonomy to determine the best way to execute your deployment. It leverages this advantage to execute steps in parallel, manage and recover from errors, resume interrupted or partial deployments, and even adapt to modifications in your modules.

This guide will walk you through the steps to install Hardhat Ignition into an existing Hardhat project, define your first module, and deploy it.

:::tip

If you don't have a Hardhat project yet, or if you want to create a new one to try Hardhat Ignition, please follow [this guide](../../../hardhat-runner/docs/getting-started/index.md) first.

:::

## Installation

To install Hardhat Ignition in an existing Hardhat project, you will need:

- Hardhat version 2.18.0 or higher
- Ethers.js version 6 or higher

You can also follow [Hardhat's Quick Start guide](../../../hardhat-runner/docs/getting-started/index.md) to create a new project from scratch to follow this guide.

:::tip

If you prefer to use **Viem** instead of **ethers**, check out the [Viem guide](../../../ignition/docs/guides/viem.md) for installation instructions.

:::

Once you have a Hardhat project ready, open a terminal in its root directory, and run:

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```sh
npm install --save-dev @nomicfoundation/hardhat-ignition-ethers
```

:::

:::tab{value="npm 6"}

```sh
npm install --save-dev @nomicfoundation/hardhat-ignition-ethers @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-ignition @nomicfoundation/hardhat-verify @nomicfoundation/ignition-core ethers
```

:::

:::tab{value=yarn}

```sh
yarn add --dev @nomicfoundation/hardhat-ignition-ethers @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-ignition @nomicfoundation/hardhat-verify @nomicfoundation/ignition-core ethers
```

:::

:::tab{value="pnpm"}

```sh
pnpm add -D @nomicfoundation/hardhat-ignition-ethers @nomicfoundation/hardhat-ignition ethers
```

:::

::::

Finally, add this to your config file to [enable the plugin](../../../hardhat-runner/docs/guides/project-setup.md#plugins-and-dependencies):

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import "@nomicfoundation/hardhat-ignition-ethers";
```

:::

:::tab{value="JavaScript"}

```javascript
require("@nomicfoundation/hardhat-ignition-ethers");
```

:::

::::

## Quick start

We are going to explore a basic scenario where we deploy a simple contract and then run a post-deployment initialization function.

### Creating your contract

Paste the following code into `contracts/Rocket.sol`:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Rocket {
    string public name;
    string public status;

    constructor(string memory _name) {
        name = _name;
        status = "ignition";
    }

    function launch() public {
        status = "lift-off";
    }
}
```

It contains a simple smart contract called `Rocket`, featuring a `launch` function that we'll call after deployment.

### Creating your first module

Modules are defined in JavaScript or TypeScript files inside of `ignition/modules`. Let's create that folder structure:

```sh
mkdir ignition
mkdir ignition/modules
```

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

And paste the following code into a `ignition/modules/Apollo.ts`. We'll explain it in a moment.

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Saturn V"]);

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

:::tab{value="JavaScript"}

And paste the following code into a `ignition/modules/Apollo.js`. We'll explain it in a moment.

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Saturn V"]);

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

::::

The first aspect to note is that modules are created by calling the `buildModule` function, which requires a module ID and a callback function. Our module will be identified as `"Apollo"`.

The callback function is where the module definition actually happens. The `m` parameter being passed into the callback is an instance of a `ModuleBuilder`, which is an object with methods to define and configure your smart contract instances.

When we call these `ModuleBuilder` methods, they create a `Future` object, which represents the result of an execution step that Hardhat Ignition needs to run to deploy a contract instance or interact with an existing one.

This doesn't execute anything against the network, it simply represents it internally. After the `Future` is created, it gets registered within the module, and the method returns it.

In our module, we created two `Future` objects by calling the `contract` and `call` methods. The initial one instructs Hardhat Ignition to deploy a `Rocket` contract instance, specifying `"Saturn V"` as the only constructor parameter. The second one indicates that we intend to execute the `launch` function of the deployed `Rocket` instance, with no arguments provided.

Finally, we return the `Future` object representing the `Rocket` contract instance, to make it accessible to other modules and tests as well.

### Deploying it

Now that our module definition is ready, let's deploy it to a local Hardhat node. Let's start by spinning up a local node:

```sh
npx hardhat node
```

Next, in a terminal in the root of your Hardhat project, run:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.ts --network localhost
```

:::

:::tab{value="JavaScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.js --network localhost
```

:::

::::

Hardhat Ignition will execute every `Future` that we defined in the right order, and display the results:

```
Hardhat Ignition 🚀

Deploying [ Apollo ]

Batch #1
  Executed Apollo#Rocket

Batch #2
  Executed Apollo#Rocket.launch

[ Apollo ] successfully deployed 🚀

Deployed Addresses

Apollo#Rocket - 0x5fbdb2315678afecb367f032d93f642f64180aa3
```

A `ignition/deployments/chain-31337` folder will be created. This contains all details about your deployment. Hardhat Ignition uses this data to recover from errors, resume a modified deployment, and more.

That's all it takes to define and execute a deployment using Hardhat Ignition. Check out the rest of the guides to learn more!
