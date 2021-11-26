# Testing with ethers.js & Waffle

Writing smart contract tests in Hardhat is done using JavaScript or TypeScript.

In this guide, we'll show you how to use [Ethers.js](https://docs.ethers.io/), a JavaScript library to interact with Ethereum, and [Waffle](https://getwaffle.io/) a simple smart contract testing library built on top of it. This is our recommended choice for testing.

Let's see how to use it going through Hardhat's sample project.

::: tip

Ethers and Waffle support TypeScript. Learn how to set up Hardhat with TypeScript [here](./typescript.md).

:::

## Setting up

[Install Hardhat](/getting-started/README.md#installation) on an empty directory. When done, run `npx hardhat`.

```
$ npx hardhat
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

Welcome to Hardhat v2.0.0

? What do you want to do? …
❯ Create a sample project
  Create an empty hardhat.config.js
  Quit
```

Select `Create a sample project`. This will create some files and install the `@nomiclabs/hardhat-ethers`, `@nomiclabs/hardhat-waffle` plugins, and other necessary packages.

::: tip

Hardhat will let you know how, but in case you missed it you can install them with `npm install --save-dev @nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers`

:::

Look at the `hardhat.config.js` file and you'll see that the Waffle plugin is enabled:

<<< @/../packages/hardhat-core/sample-projects/basic/hardhat.config.js{1}

::: tip

There's no need for `require("@nomiclabs/hardhat-ethers")`, as `@nomiclabs/hardhat-waffle` already does it.

:::

## Testing

Tests using Waffle are written with [Mocha](https://mochajs.org/) alongside [Chai](https://www.chaijs.com/). If you haven't heard of them, they are super popular JavaScript testing utilities.

Inside the `test` folder you'll find `sample-test.js`. Let's take a look at it, and we'll explain it next:

<<< @/../packages/hardhat-core/sample-projects/basic/test/sample-test.js

In your terminal, run `npx hardhat test`. You should see the following output:

```
$ npx hardhat test

  Contract: Greeter
    ✓ Should return the new greeting once it's changed (762ms)

  1 passing (762ms)
```

This means the test passed. Let's now explain each line:

```js
const { expect } = require("chai");
```

We are requiring `Chai` which is an assertions library. These asserting functions are called "matchers", and the ones we're using here actually come from Waffle.

This is why we're using the `@nomiclabs/hardhat-waffle` plugin, which makes it easier to assert values from Ethereum. Check out [this section](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html) in Waffle's documentation for the entire list of Ethereum-specific matchers.

::: warning

Some Waffle matchers return a Promise rather than executing immediately. If you're making a call or sending a transaction, make sure to check Waffle's documentation, and `await` these Promises. Otherwise your tests may pass without waiting for all checks to complete.

:::

```js
describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    // ...
  });
});
```

This wrapper just follows Mocha's proposed structure for tests, but you might have noticed the use of `async` in `it`'s callback function. Interacting with the Ethereum network and smart contracts are asynchronous operations, hence most APIs and libraries use JavaScript's `Promise` for returning values. This use of `async` will allow us to `await` the calls to our contract and the Hardhat Network node.

```js
const Greeter = await ethers.getContractFactory("Greeter");
```

A `ContractFactory` in `ethers.js` is an abstraction used to deploy new smart contracts, so `Greeter` here is a factory for instances of our greeter contract.

```js
const greeter = await Greeter.deploy("Hello, world!");
```

Calling `deploy()` on a `ContractFactory` will start the deployment, and return a `Promise` that resolves to a `Contract`. This is the object that has a method for each of your smart contract functions. Here we're passing the string `Hello, world!` to the contract's constructor.

Once the contract is deployed, we can call our contract methods on `greeter` and use them to get the state of the contract.

```js
expect(await greeter.greet()).to.equal("Hello, world!");
```

Here we're using our `Contract` instance to call a smart contract function in our Solidity code. `greet()` returns the greeter's greeting, and we're checking that it's equal to `Hello, world!`, as it should be. To do this we're using the Chai matchers `expect`, `to` and `equal`.

```js
await greeter.setGreeting("Hola, mundo!");
expect(await greeter.greet()).to.equal("Hola, mundo!");
```

We can modify the state of a contract in the same way we read from it. Calling `setGreeting` will set a new greeting message. After the `Promise` is resolved, we perform another assertion to verify that the greeting change took effect.

### Testing from a different account

If you need to send a transaction from an account other than the default one, you can use the `connect()` method provided by Ethers.js.

The first step to do so is to get the `Signers` object from `ethers`:

```js
const [owner, addr1] = await ethers.getSigners();
```

A `Signer` in Ethers.js is an object that represents an Ethereum account. It's used to send transactions to contracts and other accounts. Here we're getting a list of the accounts in the node we're connected to, which in this case is **Hardhat Network**, and only keeping the first and second ones.

::: tip

To learn more about `Signer`, you can look at the [Signers documentation](https://docs.ethers.io/v5/api/signer/#Wallet).

:::

The `ethers` variable is available in the global scope. If you like your code always being explicit, you can add this line at the top:

```js
const { ethers } = require("hardhat");
```

Finally, to execute a contract's method from another account, all you need to do is `connect` the `Contract` with the method being executed:

```js
await greeter.connect(addr1).setGreeting("Hallo, Erde!");
```

## Migrating an existing Waffle project

If you're starting a project from scratch and looking to use Waffle, you can skip this section. If you're setting up an existing Waffle project to use Hardhat you'll need to migrate the [configuration options](https://ethereum-waffle.readthedocs.io/en/latest/configuration.html) Waffle offers. The following table maps Waffle configurations to their Hardhat equivalents:

| Waffle                       | Hardhat                              |
| ---------------------------- | ------------------------------------ |
| `sourcesPath`                | `paths.sources`                      |
| `targetPath`                 | `paths.artifacts`                    |
| `solcVersion`                | `solc.version` (version number only) |
| `compilerOptions.evmVersion` | `solc.evmVersion`                    |
| `compilerOptions.optimizer`  | `solc.optimizer`                     |

As an example, this Waffle configuration file:

```json
{
  "sourcesPath": "./some_custom/contracts_path",
  "targetPath": "../some_custom/build",
  "solcVersion": "v0.4.24+commit.e67f0147",
  "compilerOptions": {
    "evmVersion": "constantinople",
    "optimizer": {
      "enabled": true,
      "runs": 200
    }
  }
}
```

Would translate into this Hardhat config:

```js
module.exports = {
  paths: {
    sources: "./some_custom/contracts_path",
    artifacts: "../some_custom/build",
  },
  solidity: {
    version: "0.4.24", // Note that this only has the version number
    settings: {
      evmVersion: "constantinople",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
```

If you're migrating an existing Waffle project to Hardhat, then the minimum configuration you'll need is changing Hardhat's compilation output path, since Waffle uses a different one by default:

```js
require("@nomiclabs/hardhat-waffle");

module.exports = {
  paths: {
    artifacts: "./build",
  },
};
```

### Adapting the tests

Now, when testing using a standalone Waffle setup, you should use the different parts of Waffle from Hardhat.

For example, instead of doing:

```js
const { deployContract } = require("ethereum-waffle");
```

You should do:

```typescript
const { waffle } = require("hardhat");
const { deployContract } = waffle;
```

::: warning

Importing Waffle's functions from `ethereum-waffle`, can lead to multiple problems.

For example, Waffle has a [default gas limit](https://github.com/EthWorks/Waffle/blob/3.0.2/waffle-cli/src/deployContract.ts#L4-L7) of 4 million gas for contract deployment transactions, which is normally too low.

Please, make sure you import them from the `waffle` field of the [Hardhat Runtime Environment]. It is a version of Waffle adapted to work well with Hardhat.

:::

Also, you don't need to call `chai.use`. This initialization is already handled by `@nomiclabs/hardhat-waffle`. Just be sure to include `require("@nomiclabs/hardhat-waffle");` in your Hardhat config.

Finally, instead of initializing a `MockProvider`, just use the plugin's provider like this:

```js
const { waffle } = require("hardhat");
const provider = waffle.provider;
```

Run your tests with `npx hardhat test` and you should get stack traces when a transaction fails.

[hardhat network]: ../hardhat-network/README.md
[hardhat runtime environment]: ../advanced/hardhat-runtime-environment.md
