## Overview

- Hardhat Ignition is a declarative smart contract deployment system.
- It allows you to define smart contract instances, their relationships, and operations you want to run on them, and it takes care of deployment and execution.
- This means focusing on what you want to do, and not in how to do it.

- You organize your deployment definition using Ignition Modules, which describe your system.
- An Ignition module is an abstraction that groups a set of smart contract instances of your system.
- In JavaScript, you create a module to define functions, classes and values, and export some of them.
- In Hardhat Ignition, you create a module to define smart contract instances and operations, and export some of those contracts.

- Creating a module doesn't interact with the Ethereum network.
- Instead, once your modules are defined, Hardhat Ignition will deploy them.

- TODOs:

  - Should mention that Ignition handles errors here?
  - Should we mention that you can modify your modules after running them?
  - If we do, it's more content than strictly necessary. If we don't, how would users be aware of those features?

- This guide will teach you how to install Hardhat Ignition into an existing Hardhat project, define your first module, and deploy it.

:::tip

If you don't have a Hardhat project yet or want to create a new one to try Hardhat Ignition, please follow [this guide](../../../hardhat-runner/docs/getting-started/index.md).

:::

## Installation

To install Hardhat Ignition in an existing Hardhat project, you should make sure that's you are using Hardhat version 2.18.0 or higher, and Ethers.js version 6. If you are unsure about it, you can follow [Hardhat's Quick Start guide](../../../hardhat-runner/docs/getting-started/index.md) to create a new project to follow this guide.

Once you have a Hardhat project, open a terminal in its root, and run

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```
npm install --save-dev @nomicfoundation/hardhat-ignition
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev @nomicfoundation/hardhat-ignition
```

:::

:::tab{value=yarn}

```
yarn add --dev @nomicfoundation/hardhat-ignition
```

:::

::::

Finally, add this to your config file

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

  constructor(string calldata _name) {
    name = _name;
    status = "ignition";
  }

  function launch() public {
    status = "lift-off";
  }
}
```

### Defining your first module

- Modules are created in javascript files inside the folder `ignition/modules`. Let's create it.
- We recommend creating a single module per file, having the same name.
- Create `ignition/modules/Apollo.{j,t}s`

- TODO: Explanation about how to create a module, what's a future, etc.

```js
module.exports = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Apollo"]);

  m.call(apollo, "launch");

  return { apollo };
});
```

### Deploying it

- Finally, to run the deployment all you have to do is running `npx hardhat igintion deploy ignition/modules/Apollo.{j,t}s`

- TODO: Should we explain that this is ephemeral here?
