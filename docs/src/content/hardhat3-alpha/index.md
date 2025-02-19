---
prev: false
---

# Hardhat 3 Alpha

## Overview

Welcome to the Hardhat 3 Alpha! This tutorial walks you through the major changes coming in Hardhat 3, including Solidity tests, support for multichain workflows, a revamped build system, and more.

We assume you are familiar with Hardhat 2, but this tutorial isn't meant as a migration guide. Since Hardhat 3 is still in alpha and its APIs might change, we recommend waiting until the beta release before migrating.

Join our [Hardhat 3 Alpha](https://t.me/+vWqXXHGklFQzZTUx) Telegram group to share feedback and stay updated on new releases. It's still early, and your input can help us make Hardhat 3 the best it can be.

## Getting started

This section covers how to initialize the sample project for this tutorial. Make sure you have Node.js v22 or later installed, along with a package manager like `npm` or `pnpm`.

Open a terminal and run these commands to create a new directory and initialize a Node.js project:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
mkdir hardhat3-alpha
cd hardhat3-alpha
npm init -y
```

:::

:::tab{value=pnpm}

```
mkdir hardhat3-alpha
cd hardhat3-alpha
pnpm init
```

:::

::::

Then initialize the sample project:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat@next --init
```

:::

:::tab{value=pnpm}

```
pnpx hardhat@next --init
```

:::

::::

Accept the default answers for each question:

1. Select the current directory as the project location.
2. Enable ESM for the project.
3. Set **Node Test Runner and Viem** as the testing setup.
4. Install the necessary dependencies.

::::tip

The built-in [Node.js test runner](https://nodejs.org/api/test.html) is fast and requires no dependencies, and [viem](https://viem.sh/) is easy to use and has powerful typing features. We recommend using them, but Hardhat will continue to support Mocha and Ethers.js for backward compatibility and for those who prefer not to switch libraries.

::::

Everything should be set up now. Verify it by printing the help output:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat
```

:::

:::tab{value=pnpm}

```
pnpm hardhat
```

:::

::::

## Solidity tests

Hardhat 3 has full support for writing Foundry-compatible Solidity tests. You can write unit, fuzz, and invariant tests, and use testing libraries like [forge-std](https://github.com/foundry-rs/forge-std) and [PRBTest](https://github.com/PaulRBerg/prb-test).

Run the sample project's Solidity tests with the `test solidity` task:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat test solidity
```

:::

:::tab{value=pnpm}

```
pnpm hardhat test solidity
```

:::

::::

The contract being tested is `Counter`, located in the `contracts/Counter.sol` file:

```solidity
contract Counter {
  uint public x;

  event Increment(uint by);

  function inc() public {
    x++;
    emit Increment(1);
  }

  function incBy(uint by) public {
    require(by > 0, "incBy: increment should be positive");
    x += by;
    emit Increment(by);
  }
}
```

And this is the content of the `contracts/Counter.t.sol` Solidity test file:

```solidity
import { Counter } from "./Counter.sol";
import { Test } from "forge-std/Test.sol";

contract CounterTest is Test {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function test_InitialValue() public view {
    require(counter.x() == 0, "Initial value should be 0");
  }

  function testFuzz_Inc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }

  function test_IncByZero() public {
      vm.expectRevert();
      counter.incBy(0);
  }
}
```

The `CounterTest` contract is deployed, and all its functions starting with `test` are executed. If an execution reverts, that test is considered a failure. Test contracts can also include a `setUp` function, which runs before each test function.

Functions that start with `test` and have no parameters are unit tests, while those with parameters are considered fuzz tests. Fuzz tests are run multiple times with randomly generated inputs. If any of those executions revert, the test fails and the input is printed.

Solidity tests have access to cheatcodes—special functions that can be called by a test to modify the EVM in non-standard ways. In the sample test, `test_IncByZero` uses the `vm.expectRevert` cheatcode, which expects the next call to revert. If the call _doesn't_ revert, the test fails. There are many other cheatcodes available; for example, you can change the value of `block.number` with the `vm.roll` cheatcode.

### Stack traces in Solidity tests

Failed tests include Solidity stack traces. To see them in action, make the `test_IncByZero` test fail by commenting out the `expectRevert` cheatcode:

```solidity{2}
  function test_IncByZero() public {
      // vm.expectRevert();
      counter.incBy(0);
  }
```

And re-run the `test solidity` task again to get a stack trace:

```
Failure (1): test_IncByZero()
Reason: revert: incBy: increment should be positive
  at Counter.incBy (contracts/Counter.sol:15)
  at CounterTest.test_IncByZero (contracts/Counter.t.sol:27)
```

## Integration tests with TypeScript

Solidity tests are great for unit testing, but there are situations where they fall short:

- **Complex tests**, where a general-purpose language is more comfortable and productive than Solidity.
- **Tests that need real blockchain behavior**, such as blocks and transactions. While you can use cheatcodes to simulate this, mocking too many things is error-prone and hard to maintain.
- **End-to-end tests**, where you test deployed contracts under conditions similar to production.

To handle these cases, Hardhat 3 continues to support writing tests in TypeScript or JavaScript.

The sample project includes a TypeScript test as an example. The `Counter` contract emits an `Increment(uint by)` event when the value is incremented. Suppose you want to send multiple transactions, aggregate all the emitted events, and assert something about the result. While this can be done in Solidity, TypeScript makes it more convenient:

```ts
describe("Counter", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("The sum of the Increment events should match the current value", async function () {
    const vault = await viem.deployContract("Counter");

    // run a series of increments
    for (let i = 1n; i <= 10n; i++) {
      await vault.write.incBy([i]);
    }

    const events = await publicClient.getContractEvents({
      address: vault.address,
      abi: vault.abi,
      eventName: "Increment",
      fromBlock: 0n,
      strict: true,
    });

    // check that the aggregated events match the current value
    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    assert.equal(total, await vault.read.x());
  });
});
```

To run the TypeScript tests in the project, execute the following command:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat test node
```

:::

:::tab{value=pnpm}

```
pnpm hardhat test node
```

:::

::::

This task comes from the Hardhat plugin for the Node.js test runner, but you can use alternative setups. We provide another plugin for Mocha, and it's possible to write plugins for other test runners as well.

To run all your tests—both Solidity and TypeScript—use the `test` task:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat test
```

:::

:::tab{value=pnpm}

```
pnpm hardhat test
```

:::

::::

## Multichain capabilities

Like other Ethereum development tools, Hardhat 2 assumes you're working with a single network that behaves like Ethereum Mainnet. That assumption made sense in the past, but it no longer reflects today's rollup-centric ecosystem.

Hardhat 3 drops that assumption:

- You can choose the type of chain you want to interact with.
- You can manage connections to multiple networks at once.

### Chain types

Hardhat 3 introduces the concept of chain types. You can think of a chain type as the common behavior shared by a chain and its testnets. The initial release supports three chain types:

- `l1`, for Ethereum Mainnet and its testnets.
- `optimism`, for OP Mainnet and OP Sepolia.
- `generic`, a fallback for chains that are not supported.

We'll gradually add new options over time.

The `scripts/send-op-tx.ts` script demonstrates how to use chain types:

```ts
import { network } from "hardhat";

const chainType = "optimism";

const { viem } = await network.connect("hardhatOp", chainType);

console.log("Sending transaction using the OP chain type");

const publicClient = await viem.getPublicClient();
const [senderClient] = await viem.getWalletClients();

console.log("Sending 1 wei from", senderClient.account.address, "to itself");

const l1Gas = await publicClient.estimateL1Gas({
  account: senderClient.account.address,
  to: senderClient.account.address,
  value: 1n,
});

console.log("Estimated L1 gas:", l1Gas);

console.log("Sending L2 transaction");
const tx = await senderClient.sendTransaction({
  to: senderClient.account.address,
  value: 1n,
});

await publicClient.waitForTransactionReceipt({ hash: tx });

console.log("Transaction sent successfully");
```

This script estimates the [L1 gas](https://docs.optimism.io/stack/transactions/fees) that will be used by an L2 transaction. It uses viem's [OP Stack extension](https://viem.sh/op-stack) on a local network configured with the `optimism` chain type. Run this command to try it out:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat run scripts/send-op-tx.ts
```

:::

:::tab{value=pnpm}

```
pnpm hardhat run scripts/send-op-tx.ts
```

:::

::::

If you edit the script and change the value of `chainType` to `"l1"`, it will no longer work. More importantly, that change will cause a compilation error, thanks to the powerful TypeScript capabilities of Hardhat 3 and viem.

### Network manager

In Hardhat 2, a task always uses a single, fixed network connection during its entire execution. You can't change this connection or create new ones. Hardhat 3 removes these limitations. You can create connections at runtime, have multiple connections simultaneously, or close them when needed.

`scripts/check-predeploy.ts` illustrates this:

```ts
import { network } from "hardhat";

// address of the GasPriceOracle predeploy in OP Stack chains
const OP_GAS_PRICE_ORACLE = "0x420000000000000000000000000000000000000F";

async function mainnetExample() {
  const { viem } = await network.connect("hardhatMainnet", "l1");

  const publicClient = await viem.getPublicClient();
  const gasPriceOracleCode = await publicClient.getCode({
    address: OP_GAS_PRICE_ORACLE,
  });

  console.log(
    "GasPriceOracle exists in l1 chain type?",
    gasPriceOracleCode !== undefined
  );
}

async function opExample() {
  const { viem } = await network.connect("hardhatOp", "optimism");

  const publicClient = await viem.getPublicClient();
  const gasPriceOracleCode = await publicClient.getCode({
    address: OP_GAS_PRICE_ORACLE,
  });

  console.log(
    "GasPriceOracle exists in optimism chain type?",
    gasPriceOracleCode !== undefined
  );
}

await mainnetExample();
await opExample();
```

Each function creates a connection to a different network and checks if a given predeploy exists.

The `network.connect` function returns a network connection, which is an object with properties related to the network:

- It includes information about the network and an EIP-1193 provider to interact with it.
- It provides extensions added by plugins, like a `viem` helper object when the `hardhat-viem` plugin is used.

`network.connect` accepts two optional parameters: a network name and a chain type. The network name corresponds to one of the networks in your Hardhat config. The chain type is used to perform validations and to properly type the returned object.

## Seamless contract deployments

Hardhat comes with an official deployment solution: [**Hardhat Ignition**](https://hardhat.org/ignition), a declarative system for deploying smart contracts. It's already available in Hardhat 2 and has been adopted by many projects. The API hasn't changed in Hardhat 3: if you're familiar with it, you won't encounter any surprises.

With Hardhat Ignition, you define the smart contract instances you want to deploy, along with any operations you want to perform on them. These definitions are grouped into Ignition Modules, which are then analyzed and executed in the most efficient way. This includes sending independent transactions in parallel, recovering from errors, and resuming interrupted deployments.

The sample project includes an Ignition Module as an example. To deploy this module in a simulated network, run the following command:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat ignition deploy ignition/modules/Counter.ts
```

:::

:::tab{value=pnpm}

```
pnpm hardhat ignition deploy ignition/modules/Counter.ts
```

:::

::::

This deployment is executed on the default network, which lasts only for the duration of the task. To simulate a deployment on a persistent network, follow these steps:

1. Start a Hardhat node with `npx hardhat node` or `pnpm hardhat node`.
2. Open another terminal and deploy the module to the Hardhat node:

   ::::tabsgroup{options=npm,pnpm}

   :::tab{value=npm}

   ```
   npx hardhat ignition deploy --network localhost ignition/modules/Counter.ts
   ```

   :::

   :::tab{value=pnpm}

   ```
   pnpm hardhat ignition deploy --network localhost ignition/modules/Counter.ts
   ```

   :::

   ::::

3. Run the same command again once the deployment finishes. Since the module has already been deployed, Ignition won't send any transactions.
4. Without stopping the node, add the following line to the Ignition module:

   ```ts{3}
   m.call(counter, "incBy", [5n]);

   m.call(counter, "inc");

   return { counter };
   ```

5. Run the command from step 2 once more. This time, only the new action runs.

While Hardhat Ignition is our recommended approach for deploying contracts, you're free to use other tools. For example, you can use custom scripts for simple deployments or a deployment plugin from the community.

### Managing secrets

Hardhat 3 includes an encrypted secrets manager that makes it easier to handle sensitive information like private keys. This ensures you don't have to hardcode secrets in your source code or store them in plain text.

The sepolia network configuration uses an encrypted secret for its RPC URL and private key:

```js
networks: {
  sepolia: {
    url: configVariable("SEPOLIA_RPC_URL"),
    accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
  },
},
```

Run the following tasks to add these secrets:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

:::

:::tab{value=pnpm}

```
pnpm hardhat keystore set SEPOLIA_RPC_URL
pnpm hardhat keystore set SEPOLIA_PRIVATE_KEY
```

:::

::::

::::tip
If you don't have an RPC URL for Sepolia, you can use a public one like `https://sepolia.gateway.tenderly.co`. Keep in mind that public endpoints like this can be slower and less reliable.
::::

Once the secrets are set, you can deploy the Ignition module to Sepolia:

::::tabsgroup{options=npm,pnpm}

:::tab{value=npm}

```
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

:::

:::tab{value=pnpm}

```
pnpm hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

:::

::::

Enter your password to decrypt the private key, confirm that you want to deploy to Sepolia, and wait until Hardhat Ignition finishes the deployment. After this, if you repeat the command, Ignition will detect that the module has already been deployed and won't send any new transactions.

Secrets are only decrypted when needed, which means you only need to enter the password if a Hardhat task actually uses a secret.

## Revamped build system

The build system was completely redesigned in Hardhat 3 to make it more powerful and flexible. The new system includes **build profiles**, offers **better npm compatibility**, and adds **opt-in support for user remappings**.

### Build profiles

Different workflows need different compiler settings. **Build profiles**, a new feature in Hardhat 3, let you handle this easily.

The sample project comes with two build profiles, `default` and `production`:

```js
solidity: {
  profiles: {
    default: {
      version: "0.8.28",
    },
    production: {
      version: "0.8.28",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
}
```

The `default` profile disables the optimizer, making it ideal for development workflows that need fast compilation times. The `production` profile is an example for production workflows, where optimized code matters more than compilation speed.

Tasks use a sensible build profile by default. For example, the `ignition deploy` task defaults to the `production` profile, while most other tasks rely on the `default` profile. You can also pass the `--build-profile` flag to choose which profile should be used.

Build profiles don't need to be explicitly defined. If you include a Solidity configuration like you do in Hardhat 2, those settings will be used in the `default` profile:

```js
solidity: {
  version: "0.8.28",
}
```

### Full npm support

The build system of Hardhat 3 is now fully integrated with npm: **anything that can be done with npm is supported**. In most cases, this won't affect you, but advanced scenarios that were previously difficult or unsupported now work out of the box.

A difficult scenario in Hardhat 2 was handling conflicting transitive dependencies. Suppose you have a project with two dependencies, each of which depends on a different version of OpenZeppelin. This leads to conflicts that require complex manual workarounds. In Hardhat 3, this same scenario works automatically without any extra effort on your part.

The new compilation system uses remappings internally to manage Solidity dependencies, but this complexity is hidden from you. **User-defined remappings are fully supported**, but using them is optional—there's no need to set them unless you want to.

## Declarative configuration

Hardhat 3 configuration is done via a TypeScript file, and it's now fully declarative. This contrasts with Hardhat 2, where some things are configured by the side effects of certain imports and function calls.

For example, in Hardhat 2 you only need to import a plugin to enable it:

```ts
// Hardhat 2
import "some-hardhat-plugin";
```

In Hardhat 3, you must explicitly add the imported plugin to the configuration object:

```ts
// Hardhat 3
import SomeHardhatPlugin from "some-hardhat-plugin";

const config: HardhatUserConfig = {
  plugins: [SomeHardhatPlugin],
  // ...other configuration...
};
```

Although slightly more verbose, a fully declarative configuration has many advantages:

- Faster load times, even with multiple plugins.
- Greater flexibility in building the configuration object, such as dynamically enabling or disabling plugins.
- The ability to create Hardhat environments at runtime, useful in advanced use cases.

Leaving aside these differences and the options related to new features, the configuration is essentially the same as in Hardhat 2.

## Powerful extensibility

The main extensibility point of Hardhat 3, like in Hardhat 2, is the ability to create custom tasks. The following example defines an `accounts` task that prints the accounts in the network:

```ts
import { task, HardhatUserConfig } from "hardhat/config";

const accountsTask = task("accounts", "Prints the list of accounts")
  .setAction(async (taskArgs, { network }) => {
    const { provider } = await network.connect();

    const accounts = await provider.request({ method: "eth_accounts" });

    console.log(accounts);
  })
  .build();

const config: HardhatUserConfig = {
  tasks: [accountsTask],
  // ...other configuration...
};
```

Defining this task is similar to how it's done in Hardhat 2, with two differences:

- It needs to be included in the configuration object, just like plugins.
- The `build` function must be called at the end.

Hardhat 3 also includes a new hook system that enables easy extension of core functionality and allows plugin authors to add their own extensibility points.

## Closing words

In this tutorial, we covered some of the biggest changes coming in Hardhat 3, including first-class Solidity tests, multichain support, a revamped build system, and more—all designed to make Ethereum development more powerful and flexible.

This is an alpha release and things are still evolving. Your feedback is invaluable, whether it's about missing features, usability issues, or anything else. Share your thoughts in the [Hardhat 3 Alpha](https://t.me/+vWqXXHGklFQzZTUx) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new?template=hardhat-3-alpha.yml) in our GitHub issue tracker.

We'll continue refining Hardhat 3 in the alpha stage until all planned features are in place. Once complete, we'll release a beta version with comprehensive documentation and a migration guide to help projects transition smoothly. Thanks for trying it out, and stay tuned for updates!