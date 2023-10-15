---
title: Getting started with Hardhat Ignition
description: Getting started with Hardhat Ignition, a declarative smart contract deployment system.
---

## Overview

Hardhat Ignition is a declarative smart contract deployment system. It allows you to define smart contract instances, their relationships, and operations you want to run on them, and it takes care of deployment and execution. This means focusing on what you want to do, and not in how to do it.

When using Hardhat Ignition, you define your deployments using Ignition Modules. An Ignition module is an abstraction you use to describe the system you want to deploy. Each Ignition Module groups a set of smart contract instances of your system.

You can think of Ignition Modules as similar to JavaScript modules. In JavaScript, you create a module to define functions, classes and values, and export some of them. In Hardhat Ignition, you create a module to define smart contract instances and operations, and export some of those contracts.

Creating a module doesn't interact with the Ethereum network. Instead, once your modules are defined, Hardhat Ignition will deploy them.

Using this declarative approach gives Hardhat Ignition more freedom to decide how to execute your deployment, which it uses to carefully execute things in parallel, handle and recover from errors, continue failed and partial deployments, and even resume a deployment after you modified or extended your modules.

This guide will teach you how to install Hardhat Ignition into an existing Hardhat project, define your first module, and deploy it.

:::tip

If you don't have a Hardhat project yet, or if you want to create a new one to try Hardhat Ignition, please follow [this guide](../../../hardhat-runner/docs/getting-started/index.md) first.

:::

## Installation

To install Hardhat Ignition in an existing Hardhat project, you should make sure that's you are using Hardhat version 2.18.0 or higher, and Ethers.js version 6. If you are unsure about it, you can follow [Hardhat's Quick Start guide](../../../hardhat-runner/docs/getting-started/index.md) to create a new project to follow this guide.

Once you have a Hardhat project, open a terminal in its root, and run

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```sh
npm install --save-dev @nomicfoundation/hardhat-ignition
```

:::

:::tab{value="npm 6"}

```sh
npm install --save-dev @nomicfoundation/hardhat-ignition
```

:::

:::tab{value=yarn}

```sh
yarn add --dev @nomicfoundation/hardhat-ignition
```

:::

::::

Finally, add this to your config file, after any other plugin

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import "@nomicfoundation/hardhat-ignition";
```

:::

:::tab{value="JavaScript"}

```javascript
require("@nomicfoundation/hardhat-ignition");
```

:::

::::

## Quick start

We are going to create a simple contract, deploy it, and run a post-deployment initialization method.

### Creating a contract

First, create a file `contracts/Rocket.sol` and save this code insde it

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

It contains a simple smart contract, `Rocket`, with a `launch` method that we'd call after deployment.

### Creating your first module

Modules are created in JavaScript or TypeScript files inside of `ignition/modules`, so let's start by creating that folder

```sh
mkdir ignition
mkdir ignition/modules
```

Next, let's first create a new file with this content, and then go over it.

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

**ignition/modules/Apollo.ts**

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Apollo"]);

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

:::tab{value="JavaScript"}

**ignition/modules/Apollo.js**

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Apollo"]);

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

::::

The first thing to note, is that modules are created by calling the `buildModule` function, passing a module id and a callback.

The callback is where the module it's actually defined. It receives an instance of a `ModuleBuilder`, which is an object with methods used to define and configure your smart contract instances.

Calling one of this methods creates a `Future`, registers it within the module, and returns it. It doesn't execute anything.

A `Future` is an object representing the result of an execution step that Hardhat Ignition needs to run to deploy a contract instance or interact with an existing one.

In our module, we defined two `Future`s. The first one tells Hardhat Ignition that we want it to deploy an instance of the contract `Rocket`, and that its only constructor parameter should be `"Apollo"`. The second one declares that after deploying that instance of `Rocket`, we want to call its `launch` method, without passing it any argument.

Finally, we return the `Future` representing the contract instance, to make it accessible to other modules and from tests.

### Deploying it

With our module defined, we we'll now deploy to a local Hardhat node.

Let's start the node first by running

```sh
npx hardhat node
```

Now, open a new terminal in the root of your Hardhat project, and run

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

Hardhat Ignition will execute every `Future` in the right order, and display these results

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

A new folder, `ignition/deployments/network-31337`, will be created, which contains all the information about your deployment, which Hardhat Ignition can use to recover from errors, continue a modified deployment, reproduce an existing one, and mode.

Continue learning about Hardhat Ignition by reading the rest of the guides.
