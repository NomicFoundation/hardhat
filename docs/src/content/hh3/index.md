---
prev: false
---

# Hardhat 3 Alpha

## Overview

Welcome to our tutorial for the alpha version of Hardhat 3. This guide will give you a preview of what's coming in Hardhat 3, including Solidity tests, support for multichain workflows, a more powerful way to manage dependencies, and much more.

We assume that you are familiar with Hardhat 2, but this is not a migration guide. Hardhat 3 is still in alpha and its APIs might change, so we recommend waiting for the beta version before migrating.

Join our "Hardhat 3 Alpha" Telegram group to share feedback and stay up to date on new releases. It's still early and things may change; if something feels off, we'd love to hear your thoughts!

## Initializing a project

This section explains how to initialize the sample project that you'll use in the rest of the tutorial. We assume that you have Node.js installed, and that you use `npm` or `pnpm` as your Node.js package manager.

Open a terminal and run the following commands to create a new directory and initialize a Node.js project:

```
mkdir hardhat3-alpha
cd hardhat3-alpha
npm init -y / pnpm init
```

Then install the Alpha version of Hardhat 3:

```
npm/pnpm install hardhat@alpha
```

In these snippets you can select the package manager you prefer and the rest of the page will reflect that choice.

You are now ready to initialize a sample project. Run the follow command:

```
npm/pnpm hardhat --init
```

Use the current directory as the path to initialize the project, which is the default option. Then you'll have to choose between using a project based on **Node Test Runner and Viem** or one based on **Mocha and Ethers.js**. Select the first one. 

::::tip
We recommend using the built-in Node.js test runner because it's fast and doesn't require any dependencies, and viem for its ease of use and powerful typing features. But we'll continue to have support for Mocha and Ethers.js, both for backwards-compatibility and for people that don't want to switch libraries.
::::

Finally, accept installing the necessary dependencies.

You should be all set up now. Check that everything works by printing the help output:

```
npm/pnpm hardhat
```

## Solidity tests

One of Hardhat 3's new features is support for writing tests in Solidity. You can run the sample project's Solidity tests with the `test solidity` task:

```
$ npx hardhat test solidity
<output>
```

A Solidity tests is a normal Solidity contract that will be executed in a special way. The contract to test is in the `contracts/Counter.sol` file:

```solidity
contract Counter {
  uint public x;

  function inc() public {
    x++;
  }

  function incBy(uint by) public {
    require(by > 0, "Counter: by must be greater than 0");
    x += by;
  }
}
```

And this is the content of the `contracts/Counter.t.sol` Solidity test file:

```solidity
import { Test } from "forge-std/Test.sol";

import "./Counter.sol";

contract CounterTest is Test {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function test_InitialValue() public view {
    require(counter.x() == 0, "Initial value should be 0");
  }

  function test_Inc() public {
    counter.inc();
    require(counter.x() == 1, "Value after calling inc should be 1");
  }

  function testFuzz_Inc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }

  function test_IncBy() public {
    counter.incBy(5);
    require(counter.x() == 5, "Value after calling incBy(5) should be 5");
  }

  function test_IncByZero() public {
    vm.expectRevert("Counter: 'by' must be greater than 0");
    counter.incBy(0);
  }
}
```

The `CounterTest` contract represents a suite of tests. All functions that start with `test` will be considered test functions. This contract will be deployed and all its tests functions will be called. If a test function reverts, that test will be considered failed. Test contracts may also have a `setUp` function which will be called before each test.

Functions that start with `test` and don't have any parameters are unit tests. But if a test function has parameters, it's considered a fuzz test. These tests will be called multiple times with different, random values as arguments. If any of these calls reverts, the test will be considered failed and the arguments that produced the failure will be printed.

Another thing that is different between normal Solidity code and Solidity tests is the possibility of using cheatcodes. Cheatcodes are special functions that can be called during a test execution to modify the state or behavior of the EVM in non-standard ways. For example, in `test_IncByZero` we are using the `vm.expectRevert` cheatcode. When used, the next call will be expected to revert; if it doesn't, the test will fail. There are many other cheatcodes. For example, you can change the value of `block.number` by using the `vm.roll` cheatcode.

Hardhat 3's Solidity tests are compatible with Foundry-style tests. You can write unit, fuzz, and invariant tests, and all testing-related cheatcodes are supported. You can write tests using any Solidity testing library, like forge-std or PRBTest.

Learn more about Hardhat 3's Solidity tests [here](/hh3/under-the-hood/solidity-tests).

## TypeScript tests

Solidity tests are excellent for writing unit tests, but there are situations where they fall short:

- Complex tests, where using a general-purpose language is more comfortable than using Solidity.
- Scenarios where having a real blockchain with blocks and transactions is useful. You can simulate these scenarios in Solidity tests by mocking the fields of the blocks or transactions need, but this can be error-prone and hard to manage.
- Integration or end-to-end tests, where you want to test your contracts after deploying them in the same way you'd do it in production.

To address these limitations, Hardhat 3 continues to support writing tests in TypeScript or JavaScript.

The sample project includes a \<example contract>, which is tested with this TypeScript test:

\<example test>

Doing the same thing in Solidity is possible but more involved.

To run the test, execute the following command:

```
npm/pnpm hardhat test node
```

The test is run with the Node.js test runner, but using other test runners is possible. We have official plugins for both the Node.js test runner and for Mocha, but writing plugins for other test runners is possible.

You can also run all your tests—both Solidity and TypeScript—simply by executing the `test` task:

\<output>

## Multichain support

Hardhat 2, like other Ethereum development tools, makes an implicit assumption about your development workflow: you interact with a single network at a time, and that network behaves like the Ethereum Mainnet. That assumption used to be true, but it isn't anymore as the community executes on our rollup-centric roadmap.

Both assumptions are dropped in Hardhat 3:
- You can select the type of chain you want to interact with.
- You can manage connections to multiple networks.

### Chain types

Hardhat 3 introduces the concept of chain types. You can think of a chain type as the shared behavior between a chain and its testnets. The first release has support for three chain types:

- Mainnet, \<explanation>
- OP Mainnet, \<explanation>
- Generic, \<explanation>

We plan to add support for other chain types over time.

The sample project includes a script that shows how chain types can be used in practice. The script uses Viem's OP Stack extensions in a local chain with the OP Mainnet type. Run the following command to see it in practice:

```
npm/pnpm hardhat run scripts/send-op-tx.ts
```

If you edit the script and change the type to `"mainnet"`, the script will no longer work. And that's not all: that change will produce a compilation error in the code, thanks to the powerful TypeScript capabilities of Hardhat 3 and Viem.

### Network manager

When you run a task in Hardhat 2, you always get a connection to a network. This connection is available during the whole task execution, and cannot be changed. You can't create other connections either. None of this is true in Hardhat 3.

Connections in Hardhat 3 are created explicitly. You can create connections at any point during the execution, have multiple connections, and close them at any point too.

Open the `scripts/send-op-tx.ts` again. The following statement in that script shows how a network connection is created:

```
network.connect example
```

The `network.connect` API call returns a network connection. A connection has low-level functionality, like a EIP-1193 provider to interact with the network, but it also includes high-level functionality that can be extended via plugins. In this example, a `viem` instance is returned because our project uses the `hardhat-viem` plugin.

A call to `network.connect` can receive a network name and a chain type. Both are optional. The network name corresponds to one of the networks in your Hardhat config. The chain type is mainly used to infer the proper types in the returned connection, but it's also used to perform some basic validations.

## Deploying contracts

Hardhat 3 comes with an official deployment solution: Hardhat Ignition. Hardhat Ignition is a declarative system for deploying smart contracts. It's already available in Hardhat 2 and being used by many projects. The API of Hardhat Ignition hasn't changed between its Hardhat 2 and Hardhat 3 versions, so if you are already familiar with it you won't find any surprises.

In Hardhat Ignition you define the smart contract instances you want to deploy, and any operation you want to run on them. These definitions are grouped in Ignition Modules, which are then analyzed by Hardhat Ignition and executed in the best possible way. This includes things like sending independent transactions in parallel, recovering from errors, and resuming interrupted deployments.

The sample project includes an Ignition Module as an example. To deploy this module in a simulated network, run the following command:

```
\<example command>
```

This network exists for the duration of the task, so the deployments are ephemeral. To simulate a deployment in a more long-lived network, follow these steps:

1. Start a Hardhat node with `npx hardhat node` or `pnpm hardhat node`.
2. In another terminal, run `npx hardhat ignition deploy --network localhost`. This will deploy the module in the node.
3. Once the deployment finishes, run the same command again. Nothing is done this time, because we have already deployed that module.
4. Without stopping the node, add a new action at the end of the module:
    ```
    \<example diff>
    ```
5. Run the deployment once more. Now only the new action will be performed.

While Hardhat Ignition is our recommended approach for deploying contracts, you can choose to use anything else. For example, you can use plain scripts for simple deployments, or you could use a deployment plugin developed by the community.

## Build profiles

Different workflows require compiling the project with different settings. **Build profiles** are a new feature in Hardhat 3 that lets you do precisely that.

The sample project includes two build profiles, `default` and `production`:

```
<snippet>
```

The `default` profile disables the optimizer, and is meant for development workflows that require fast compilation times. Most tasks use this profile by default. The `production` profile, on the other hand, is meant for production workflows where optimized code is important and slower compilation times are acceptable. The `ignition deploy` task uses this profile.

Other build profiles exist, and you can define your own. You can also use the `--build-profile` flag to select a profile when running a task.

It's not necessary to explicitly define build profiles in the config. You can just define a solidity configuration and it will be used as the `default` profile:

```
<snippet>
```

## Managing dependencies

Hardhat 3 continues to use npm as the package manager for Solidity dependencies. In most cases, your workflow will remain exactly the same. However, we've revamped how dependencies are managed under the hood to add built-in support for remappings and enable new use cases.

Remappings are now fully supported, but they are completely optional. You don't have to use them unless you want to. Internally, Hardhat 3 relies on remappings to make npm work better for Solidity projects—but this complexity is hidden from you.

Some advanced scenarios used to require complicated workarounds, or simply weren't possible at all. For example, as projects grow, managing transitive dependencies can become a challenge. In Hardhat 3, this is handled automatically and things just work.

Learn more about this in ...

## Configuration

As with Hardhat 2, Hardhat 3 configuration is done via a TypeScript file that exports an object. The main difference is that the configuration now is fully declarative, whereas in Hardhat 2 some things were configured by the side effects of certain imports and function calls.

For example, to use a plugin in Hardhat 2, you just needed to import it:

```ts
import "some-hardhat-plugin";
```

In Hardhat 3, on the other hand, you need to explicitly add the imported plugin to the configuration object:

```ts
import SomeHardhatPlugin from "some-hardhat-plugin";

export default {
  plugins: [SomeHardhatPlugin],
  // ...other configuration...
}
```

While this is slightly more verbose, having a fully declarative configuration has many advantages:

- Faster load times, even when you have multiple plugins.
- More flexibility when building the configuration object, like dynamically enabling or disabling plugins.
- The ability to create Hardhat environments at runtime, which is useful for advanced use cases.

Leaving this difference aside, and the addition of new configuration options related to new features, the configuration object looks and feels the same as in Hardhat 2.

## Extensibility

The main extensibility point of Hardhat 3 is the same as in Hardhat 2: the ability to create custom tasks. The following example adds an `accounts` task that prints the accounts in the network:

```ts
import { task } from "hardhat/config";

const accountsTask = task("accounts", "Prints the list of accounts")
  .setAction(async (taskArgs, { network }) => {
    const { viem } = await network.connect();

    const walletClients = await viem.getWalletClients()

    for (const walletClient of walletClients) {
      console.log(walletClient.account.address)
    }
  })
  .build();

export default {
  tasks: [accountsTask],
  // ...other configuration...
}
```

This task is pretty much the same as in Hardhat 2, except for two differences:

- The task needs to be included in the configuration object, like with plugins.
- The `build` function has to be called at the end.

Hardhat 3 also includes a new and powerful hook system that lets you easily extend core functionality, and allows plugin authors to add their own extensibility points. Learn more about Hooks in ...

## Closing words

In this tutorial, we explored some of the biggest changes in Hardhat 3, including first-class Solidity tests, multichain capabilities, improved dependency management, and more—all designed to make Ethereum development more powerful and flexible.

Since this is an alpha release, things are still evolving. Your feedback is invaluable, whether it’s about missing features, usability issues, or anything else. You can share your thoughts in our Hardhat 3 Alpha Telegram group or open an issue in our GitHub issue tracker.

We’ll continue refining Hardhat 3 in the alpha stage until all planned features are in place. After that, we’ll release a beta with comprehensive documentation and a migration guide to help projects transition smoothly. Thanks for trying it out, and stay tuned for updates!