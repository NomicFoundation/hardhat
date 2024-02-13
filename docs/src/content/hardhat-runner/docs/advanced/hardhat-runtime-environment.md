# Hardhat Runtime Environment (HRE)

## Overview

The Hardhat Runtime Environment, or HRE for short, is an object containing all the functionality that Hardhat exposes when running a task or test. In reality, Hardhat _is_ the HRE.

When you require Hardhat (`const hardhat = require("hardhat")`) you're getting an instance of the HRE.

During initialization, the Hardhat configuration file essentially constructs a list of things to be added to the HRE. This includes tasks, configs and plugins. Then when tasks or tests run, the HRE is always present and available to access anything that is contained in it.

The HRE has a role of centralizing coordination across all Hardhat components. This architecture allows for plugins to inject functionality that becomes available everywhere the HRE is accessible.

## Using the HRE

By default, the HRE gives you programmatic access to the task runner and the config system, and exports an [EIP1193-compatible](https://eips.ethereum.org/EIPS/eip-1193) Ethereum provider.

Plugins can extend the HRE. For example, [hardhat-ethers](https://github.com/NomicFoundation/hardhat/tree/main/packages/hardhat-ethers) adds an Ethers.js instance to it, making it available to tasks and tests.

### As global variables

Before running a task or test, Hardhat injects the HRE into the global scope, turning all of its fields into global variables. When the task execution is completed, these global variables are removed, restoring their original value, if they had one.

### Explicitly

Not everyone likes magic global variables, and Hardhat doesn't force you to use them. Everything can be done explicitly in tasks and tests.

When writing tests, you can use `require("hardhat")` to import the HRE. You can read more about this in [Accessing the HRE from outside a task](#accessing-the-hre-from-outside-a-task).

You can import the config API explicitly when defining your tasks, and receive the HRE explicitly as an argument to your actions. You can read more about this in [Creating your own tasks](./create-task.md).

## Accessing the HRE from outside a task

The HRE can be used from any JavaScript or TypeScript file. To do so, you only have to import it with `require("hardhat")`. You can do this to keep more control over your development workflow, create your own tools, or to use Hardhat with other dev tools from the node.js ecosystem.

Running test directly with [Mocha](https://www.npmjs.com/package/mocha) instead of `npx hardhat test` can be done by explicitly importing the HRE in them like this:

```js
const hre = require("hardhat");
const assert = require("assert");

describe("Hardhat Runtime Environment", function () {
  it("should have a config field", function () {
    assert.notEqual(hre.config, undefined);
  });
});
```

This way, tests written for Hardhat are just normal Mocha tests. This enables you to run them from your favorite editor without the need of any Hardhat-specific plugin. For example, you can [run them from Visual Studio Code using Mocha Test Explorer](../advanced/vscode-tests.md).

## Extending the HRE

The HRE only provides the core functionality that users and plugin developers need to start building on top of Hardhat. Using it to interface directly with Ethereum in your project can be somewhat harder than expected.

Everything gets easier when you use higher-level libraries, like [Ethers.js](https://docs.ethers.org/v6/) or [ethereum-waffle](https://www.npmjs.com/package/ethereum-waffle), but these libraries need some initialization to work, and that could get repetitive.

Hardhat lets you hook into the HRE construction, and extend it with new functionality. This way, you only have to initialize everything once, and your new features or libraries will be available everywhere the HRE is used.

You can do this by adding an HRE extender into a queue. This extender is just a synchronous function that receives the HRE and adds fields to it with your new functionality. These new fields will also get [injected into the global scope during runtime](#exporting-globally).

For example, adding an instance of [Web3.js](https://web3js.readthedocs.io/en/latest/) to the HRE can be done by installing the `web3` package and adding the following to your `hardhat.config.js`:

```js
extendEnvironment((hre) => {
  const Web3 = require("web3");
  hre.Web3 = Web3;

  // hre.network.provider is an EIP1193-compatible provider.
  hre.web3 = new Web3(hre.network.provider);
});
```
