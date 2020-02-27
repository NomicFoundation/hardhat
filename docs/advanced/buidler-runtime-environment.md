# Buidler Runtime Environment (BRE)

## Overview

The Buidler Runtime Environment, or BRE for short, is an object containing all the functionality that Buidler exposes when running a task, test or script. In reality, Buidler _is_ the BRE.

When you require Buidler (`const buidler = require("@nomiclabs/buidler")`) you're getting an instance of the BRE.

During initialization, the Buidler configuration file essentially constructs a list of things to be added to the BRE. This includes tasks, configs and plugins. Then when tasks, tests or scripts run, the BRE is always present and available to access anything that is contained in it.

The BRE has a role of centralizing coordination across all Buidler components. This architecture allows for plugins to inject functionality that becomes available everywhere the BRE is accessible.

## Using the BRE

By default, the BRE gives you programmatic access to the task runner and the config system, and exports an [EIP1193-compatible](https://eips.ethereum.org/EIPS/eip-1193) Ethereum provider. You can find more information about [it in its API docs](/api/classes/environment.html).

Plugins can extend the BRE. For example, [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) adds a Web3.js instance to it, making it available to tasks, tests and scripts.

### As global variables

Before running a task, test or script, Buidler injects the BRE into the global scope, turning all of its fields into global variables. When the task execution is completed, these global variables are removed, restoring their original value, if they had one.

### Explicitly

Not everyone likes magic global variables, and Buidler doesn't force you to use them. Everything can be done explicitly in tasks, tests and scripts.

When writing tests or scripts, you can use `require("@nomiclabs/buidler")` to import the BRE. You can read more about this in [Accessing the BRE from outside a task](#accessing-the-bre-from-outside-a-task).

You can import the config DSL explicitly when defining your tasks, and receive the BRE explicitly as an argument to your actions. You can read more about this in [Creating your own tasks](#creating-your-own-tasks).

## Extending the BRE

The BRE only provides the core functionality that users and plugin developers need to start building on top of Buidler. Using it to interface directly with Ethereum in your project can be somewhat harder than expected.

Everything gets easier when you use higher-level libraries, like [Web3.js](https://web3js.readthedocs.io/en/latest/) or [@truffle/contract](https://www.npmjs.com/package/@truffle/contract), but these libraries need some initialization to work, and that could get repetitive.

Buidler lets you hook into the BRE construction, and extend it with new functionality. This way, you only have to initialize everything once, and your new features or libraries will be available everywhere the BRE is used.

You can do this by adding a BRE extender into a queue. This extender is just a synchronous function that receives the BRE, and adds fields to it with your new functionality. These new fields will also get [injected into the global scope during runtime](#exporting-globally).

For example, adding an instance of Web3.js to the BRE can be done in this way:

```js
extendEnvironment(bre => {
  const Web3 = require("web3");
  bre.Web3 = Web3;

  // bre.network.provider is an EIP1193-compatible provider.
  bre.web3 = new Web3(new Web3HTTPProviderAdapter(bre.network.provider));
});
```

## Accessing the BRE from outside a task

The BRE can be used from any JavaScript or TypeScript file. To do so, you only have to import it with `require("@nomiclabs/buidler")`. You can do this to keep more control over your development workflow, create your own tools, or to use Buidler with other dev tools from the node.js ecosystem.

Running test directly with [Mocha](https://www.npmjs.com/package/mocha) instead of `npx buidler test` can be done by explicitly importing the BRE in them like this:

```js
const bre = require("@nomiclabs/buidler");
const assert = require("assert");

describe("Buidler Runtime Environment", function() {
  it("should have a config field", function() {
    assert.notEqual(bre.config, undefined);
  });
});
```

This way, tests written for Buidler are just normal Mocha tests. This enables you to run them from your favorite editor without the need of any Buidler-specific plugin. For example, you can [run them from Visual Studio Code using Mocha Test Explorer](../guides/vscode-tests.md).
