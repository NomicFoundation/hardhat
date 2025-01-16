# Upgradeable Contracts

When developing smart contracts, you may decide to use an upgradeable proxy pattern to allow for future upgrades to your contracts. This guide will explain how to create Ignition modules to deploy and interact with your upgradeable proxy contracts.

While there are several different proxy patterns, each with their own tradeoffs, this guide will focus on the [TransparentUpgradeableProxy](https://docs.openzeppelin.com/contracts/5.x/api/proxy#TransparentUpgradeableProxy) pattern. You can read more about upgradeable proxy patterns [on OpenZeppelin's blog](https://blog.openzeppelin.com/proxy-patterns).

:::tip

The finished code for this guide can be found in the [Hardhat Ignition monorepo](https://github.com/NomicFoundation/hardhat-ignition/tree/development/examples/upgradeable)

:::

## Installation

Before we get started, make sure you have the OpenZeppelin Contracts library installed in your project. You can install it using npm or yarn:

::::tabsgroup{options="npm,yarn,pnpm"}

:::tab{value="npm"}

```sh
npm install @openzeppelin/contracts
```

:::

:::tab{value=yarn}

```sh
yarn add @openzeppelin/contracts
```

:::

:::tab{value="pnpm"}

```sh
pnpm add @openzeppelin/contracts
```

:::

::::

## Getting to know our contracts

Let's take a look at the contracts we'll be deploying and interacting with.

First, inside our `contracts` directory, we'll create a file called `Demo.sol`:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// A contrived example of a contract that can be upgraded
contract Demo {
  function version() public pure returns (string memory) {
    return "1.0.0";
  }
}
```

This is the contract that we'll be upgrading. It's a simple contract that returns a version string.

Let's go ahead and create our upgraded version of this contract in a new file called `DemoV2.sol`:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// A contrived example of a contract that can be upgraded
contract DemoV2 {
  string public name;

  function version() public pure returns (string memory) {
    return "2.0.0";
  }

  function setName(string memory _name) public {
    name = _name;
  }
}
```

In addition to updating the version string, this contract also adds a `name` state variable and a `setName` function that allows us to set the value of `name`. We'll use this function later when we upgrade our proxy.

Finally, we'll create a file called `Proxies.sol` to import our proxy contracts. This file will look a little different from the others:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
```

Because we're using the OpenZeppelin proxy contracts, we need to import them here to make sure Hardhat knows to compile them. This will ensure that their artifacts are available for Hardhat Ignition to use later when we're writing our Ignition modules.

## Writing our Ignition modules

Inside our `ignition` directory, we'll create a directory called `modules`, if one doesn't already exist. Inside this directory, we'll create a file called `ProxyModule.js` (or `ProxyModule.ts` if you're using TypeScript). Inside this file, we'll break up our first Ignition module into two parts.

### Part 1: Deploying our proxies

As always, we'll begin by importing `buildModule` from `@nomicfoundation/hardhat-ignition/modules`, then we'll define our first module, which we'll call `ProxyModule`:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const proxyModule = buildModule("ProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const demo = m.contract("Demo");

  const proxy = m.contract("TransparentUpgradeableProxy", [
    demo,
    proxyAdminOwner,
    "0x",
  ]);

  const proxyAdminAddress = m.readEventArgument(
    proxy,
    "AdminChanged",
    "newAdmin"
  );

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy };
});
```

:::

:::tab{value="JavaScript"}

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const proxyModule = buildModule("ProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const demo = m.contract("Demo");

  const proxy = m.contract("TransparentUpgradeableProxy", [
    demo,
    proxyAdminOwner,
    "0x",
  ]);

  const proxyAdminAddress = m.readEventArgument(
    proxy,
    "AdminChanged",
    "newAdmin"
  );

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy };
});
```

:::

::::

Let's break down what's happening here.

First, we're getting our account that will own the ProxyAdmin contract. This account will not be able to interact with the proxy, but it will be able to upgrade it. In this case, we'll use the first account in our Hardhat accounts array.

Next, we deploy our `Demo` contract. This will be the contract that we'll upgrade.

Then we deploy our `TransparentUpgradeableProxy` contract. This contract will be deployed with the `Demo` contract as its implementation, and the `proxyAdminOwner` account as its owner. The third argument is the initialization code, which we'll leave blank for now by setting to an empty hex string (`"0x"`).

When we deploy the proxy, it will automatically create a new `ProxyAdmin` contract within its constructor. We'll need to get the address of this contract so that we can interact with it later. To do this, we'll use the `m.readEventArgument(...)` method to read the `newAdmin` argument from the `AdminChanged` event that is emitted when the proxy is deployed.

Finally, we'll use the `m.contractAt(...)` method to tell Ignition to use the `ProxyAdmin` ABI for the contract at the address we just retrieved. This will allow us to interact with the `ProxyAdmin` contract when we upgrade our proxy.

### Part 2: Interacting with our proxy

Now that we have a module for deploying our proxy, we're ready to interact with it. To do this, we'll create a new module called `DemoModule` inside this same file:

```js
const demoModule = buildModule("DemoModule", (m) => {
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const demo = m.contractAt("Demo", proxy);

  return { demo, proxy, proxyAdmin };
});
```

First, we use the `m.useModule(...)` method to get the proxy contract from the previous module. This will ensure that the proxy is deployed before we try to upgrade it.

Then, similar to what we did with our `ProxyAdmin` above, we use `m.contractAt("Demo", proxy)` to tell Ignition to use the `Demo` ABI for the contract at the address of the proxy. This will allow us to interact with the `Demo` contract through the proxy when we use it in tests or scripts.

Finally, we return the `Demo` contract instance so that we can use it in other modules, or tests and scripts. We also return the `proxy` and `proxyAdmin` contracts so that we can use them to upgrade our proxy in the next module.

As a last step, we'll export `demoModule` from our file so that we can deploy it and use it in our tests or scripts:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
export default demoModule;
```

:::

:::tab{value="JavaScript"}

```javascript
module.exports = demoModule;
```

:::

::::

### Part 3: Upgrading our proxy with an initialization function

Next it's time to upgrade our proxy to a new version. To do this, we'll create a new file within our `ignition/modules` directory called `UpgradeModule.js` (or `UpgradeModule.ts` if you're using TypeScript). Inside this file, we'll again break up our module into two parts. To start, we'll write our `UpgradeModule`:

```js
const upgradeModule = buildModule("UpgradeModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const { proxyAdmin, proxy } = m.useModule(proxyModule);

  const demoV2 = m.contract("DemoV2");

  const encodedFunctionCall = m.encodeFunctionCall(demoV2, "setName", [
    "Example Name",
  ]);

  m.call(proxyAdmin, "upgradeAndCall", [proxy, demoV2, encodedFunctionCall], {
    from: proxyAdminOwner,
  });

  return { proxyAdmin, proxy };
});
```

This module begins the same way as `ProxyModule`, by getting the account that owns the `ProxyAdmin` contract. We'll use this in a moment to upgrade the proxy.

Next, we use the `m.useModule(...)` method to get the `ProxyAdmin` and proxy contracts from the previous module.

Then, we deploy our `DemoV2` contract. This will be the contract that we'll upgrade our proxy to.

Next, we encode a call to the `setName` function in the `DemoV2` contract. This function takes a single argument, a string, which we'll set to `"Example Name"`. This encoded function call will be used to call the `setName` function on the `DemoV2` contract when we upgrade the proxy.

Finally, we call the `upgradeAndCall` method on the `ProxyAdmin` contract. This method takes three arguments: the proxy contract, the new implementation contract, and a data parameter that can be used to call an additional function on the target contract. In this case, we're calling the `setName` function on the `DemoV2` contract with the encoded function call we created earlier. We also provide the `from` option to ensure that the upgrade is called from the owner of the `ProxyAdmin` contract.

Lastly, we again return the `ProxyAdmin` and proxy contracts so that we can use them in our next module.

### Part 4: Interacting with our upgraded proxy

Finally, in the same file, we'll create our module called `DemoV2Module`:

```js
const demoV2Module = buildModule("DemoV2Module", (m) => {
  const { proxy } = m.useModule(upgradeModule);

  const demo = m.contractAt("DemoV2", proxy);

  return { demo };
});
```

This module is similar to `DemoModule`, but instead of using the `Demo` contract, we use the `DemoV2` contract. Though the `Demo` contracts are contrived for this example and don't actually change the ABI between upgrades, this module demonstrates how you can interact with different versions of your contract ABI through the same proxy.

As before, we return the `DemoV2` contract instance so that we can use it in other modules, or tests and scripts. We could also return the `proxy` and `proxyAdmin` contracts if we needed to interact with them further, but for the purposes of this example, we left them out.

As a last step, we'll export `demoV2Module` from our file so that we can deploy it and use it in our tests or scripts:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
export default demoV2Module;
```

:::

:::tab{value="JavaScript"}

```javascript
module.exports = demoV2Module;
```

:::

::::

## Testing our Ignition modules

Now that we've written our Ignition modules for deploying and interacting with our proxy, let's write a couple of simple tests to make sure everything works as expected.

Inside our `test` directory, we'll create a file called `ProxyDemo.js` (or `ProxyDemo.ts` if you're using TypeScript):

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import { expect } from "chai";
import { ignition, ethers } from "hardhat";

import ProxyModule from "../ignition/modules/ProxyModule";
import UpgradeModule from "../ignition/modules/UpgradeModule";

describe("Demo Proxy", function () {
  describe("Proxy interaction", function () {
    it("Should be interactable via proxy", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(ProxyModule);

      expect(await demo.connect(otherAccount).version()).to.equal("1.0.0");
    });
  });

  describe("Upgrading", function () {
    it("Should have upgraded the proxy to DemoV2", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(UpgradeModule);

      expect(await demo.connect(otherAccount).version()).to.equal("2.0.0");
    });

    it("Should have set the name during upgrade", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(UpgradeModule);

      expect(await demo.connect(otherAccount).name()).to.equal("Example Name");
    });
  });
});
```

:::

:::tab{value="JavaScript"}

```javascript
const { expect } = require("chai");

const ProxyModule = require("../ignition/modules/ProxyModule");
const UpgradeModule = require("../ignition/modules/UpgradeModule");

describe("Demo Proxy", function () {
  describe("Proxy interaction", function () {
    it("Should be interactable via proxy", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(ProxyModule);

      expect(await demo.connect(otherAccount).version()).to.equal("1.0.0");
    });
  });

  describe("Upgrading", function () {
    it("Should have upgraded the proxy to DemoV2", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(UpgradeModule);

      expect(await demo.connect(otherAccount).version()).to.equal("2.0.0");
    });

    it("Should have set the name during upgrade", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(UpgradeModule);

      expect(await demo.connect(otherAccount).name()).to.equal("Example Name");
    });
  });
});
```

:::

::::

Here we use Hardhat Ignition to deploy our imported modules. First, we deploy our base `ProxyModule` that returns the first version of our `Demo` contract and tests it to ensure the proxy worked and retrieves the appropriate version string. Then, we deploy our `UpgradeModule` that returns an upgraded version of our `Demo` contract and tests it to ensure the proxy returns the updated version string. We also test that our initialization function was called, setting the `name` state variable to `"Example Name"`.

## Further reading

In this guide we learned how to use Hardhat Ignition to deploy and interact with an upgradeable proxy contract. While this specific example may not be useful in a production environment, it can be used as a starting point for more complex upgradeable proxy patterns.

Here are some additional resources to learn more about topics discussed in this guide:

- [OpenZeppelin's blog post on proxy patterns](https://blog.openzeppelin.com/proxy-patterns)
- [OpenZeppelin's documentation on the TransparentUpgradeableProxy used in this guide](https://docs.openzeppelin.com/contracts/5.x/api/proxy#TransparentUpgradeableProxy)
- [Hardhat Ignition's documentation on creating Ignition modules](/ignition/docs/guides/creating-modules)
- [Hardhat Ignition's documentation on testing Ignition modules](/ignition/docs/guides/tests)
