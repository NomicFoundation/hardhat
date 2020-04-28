# Testing with ethers.js & Waffle

[Waffle](https://getwaffle.io/) is a simple smart contract testing library built on top of [Ethers.js](https://docs.ethers.io/ethers.js/html/). Tests in Waffle are written using [Mocha](https://mochajs.org/) alongside with [Chai](https://www.chaijs.com/). It's our recommended choice for testing.

Let's see how to use it going through Buidler's sample project.

::: tip
Waffle supports TypeScript. Learn how to set up Buidler with TypeScript [here](/typescript.md).
:::

## Setting up

[Install Buidler](/getting-started/#local-installation-recommended) on an empty directory. When done, run `npx buidler`.  

```
$ npx buidler
888               d8b      888 888
888               Y8P      888 888
888                        888 888
88888b.  888  888 888  .d88888 888  .d88b.  888d888
888 "88b 888  888 888 d88" 888 888 d8P  Y8b 888P"
888  888 888  888 888 888  888 888 88888888 888
888 d88P Y88b 888 888 Y88b 888 888 Y8b.     888
88888P"   "Y88888 888  "Y88888 888  "Y8888  888

👷 Welcome to Buidler v1.0.0 👷‍‍

? What do you want to do? …
❯ Create a sample project
  Create an empty buidler.config.js
  Quit
```

Select `Create a sample project`. This will create some files but also install the necessary packages.

::: tip
Buidler will let you know how, but in case you missed it you can install them with `npm install --save-dev @nomiclabs/buidler-waffle ethereum-waffle chai @nomiclabs/buidler-ethers ethers`
:::

Look at the `buidler.config.js` file and you'll see that the Waffle plugin is enabled:

<<< @/../packages/buidler-core/sample-project/buidler.config.js{1}

::: tip 
There's no need for `usePlugin("@nomiclabs/buidler-ethers")`, as `buidler-waffle` already does it.
:::

## Testing

Inside `test` folder you'll find  `sample-test.js`. Let's take a look at it, and we'll explain it next:

<<< @/../packages/buidler-core/sample-project/test/sample-test.js

On your terminal run `npx buidler test`. You should see the following output:

```
$ npx buidler test
Compiling...
Compiled 1 contract successfully


  Contract: Greeter
    ✓ Should return the new greeting once it's changed (762ms)

  1 passing (762ms)
```

This means the test passed. Let's now explain each line:

```js
const { expect } = require("chai");
```
We are requiring `Chai` which is an assertions library. These asserting functions are called "matchers", and the ones we're using here actually come from Waffle. This is why we're using the `buidler-waffle` plugin, which makes it easier to assert values from Ethereum. Check out [this section](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html) in Waffle's documentation for the entire list of Ethereum-specific matchers.

```js
describe("Greeter", function() {
  it("Should return the new greeting once it's changed", async function() {
    // ...
  });
});
```

This wrapper just follows Mocha's proposed structure for tests, but you might have noticed the use of `async` in `it`'s callback function. Interacting with the Ethereum network and smart contracts are asynchronous operations, hence most APIs and libraries use JavaScript's `Promise` for returning values. This use of `async` will allow us to `await` the calls to our contract and the Buidler EVM node.

```js
const Greeter = await ethers.getContractFactory("Greeter");
```

A `ContractFactory` in `ethers.js` is an abstraction used to deploy new smart contracts, so `Greeter` here is a factory for instances of our greeter contract.

```js
const greeter = await Greeter.deploy("Hello, world!");
```

Calling `deploy()` on a `ContractFactory` will start the deployment, and return a `Promise` that resolves to a `Contract`. This is the object that has a method for each of your smart contract functions. Here we're passing the string `Hello, world!` to the contract's constructor.

```js
await greeter.deployed();
```

When you call on `deploy()` the transaction is sent, but the contract isn't actually deployed until the transaction is mined. Calling `deployed()` will return a `Promise` that resolves once this happens, so this code is blocking until the deployment finishes.

Once the contract is deployed, we can call our contract methods on `greeter` and use them to get the state of the contract.

```js
expect(await greeter.greet()).to.equal("Hello, world!");
```

Here we're using our `Contract` instance to call a smart contract function in our Solidity code. `greet()` returns the greeter's greeting and we're checking that it's equal to `Hello, world!`, as it should. To do this we're using the Chai matchers `expect`, `to` and `equal`. 

```js
await greeter.setGreeting("Hola, mundo!");
expect(await greeter.greet()).to.equal("Hola, mundo!");
```

We can modify the state of a contract in the same way we read from it. Calling `setGreeting` will set a new greeting message. After the `Promise` is resolved, we perform another assertion to verify that the greeting effectively changed.

### Testing from a different account

If you need to send a transaction from an account other than the default one, you can use the `connect()` method provided by Ethers.js.

The first step to do so is to get the `Signers` object from `ethers`:
```js
const [owner, addr1] = await ethers.getSigners();
```
A `Signer` in Ethers.js is an object that represents an Ethereum account. It's used to send transactions to contracts and other accounts. Here we're getting a list of the accounts in the node we're connected to, which in this case is **Buidler EVM**, and only keeping the first and second ones.

::: tip
To learn more about `Signer`, you can look at the [Signers documentation](https://docs.ethers.io/ethers.js/html/api-wallet.html).
:::

The `ethers` variable is available in the global scope. If you like your code always being explicit, you can add this line at the top:
```js
const { ethers } = require("@nomiclabs/buidler");
```

Finally, to execute a contract's method from another account, all you need to do is `connect` the `Contract` with the method being executed:

```js
await greeter.connect(addr1).setGreeting("Hallo, Erde!");
```

## Migrating an existing Waffle project

If you're starting a project from scratch and looking to use Waffle, you can skip this section. If you're setting up an existing Waffle project to use Buidler you'll need to migrate the [configuration options](https://ethereum-waffle.readthedocs.io/en/latest/configuration.html) Waffle offers. The following table maps Waffle configurations to their Buidler equivalents:
|Waffle|Buidler|
|---|---|
|`sourcesPath`|`paths.sources`|
|`targetPath`|`paths.artifacts`|
|`solcVersion`|`solc.version` (version number only)|
|`compilerOptions.evmVersion`|`solc.evmVersion`|
|`compilerOptions.optimizer`|`solc.optimizer`|

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

Would translate into this Buidler config:

```js
module.exports = {
  paths: {
    sources: "./some_custom/contracts_path",
    artifacts: "../some_custom/build"
  },
  solc: {
    version: "0.4.24", // Note that this only has the version number
    evmVersion: "constantinople",
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
```

If you're migrating an existing Waffle project to Buidler, then the minimum configuration you'll need is changing Buidler's compilation output path, since Waffle uses a different one by default:

```js
usePlugin("@nomiclabs/buidler-waffle");

module.exports = {
  paths: {
    artifacts: "./build"
  }
};
```

### Adapting the tests

Now, when testing using a standalone Waffle setup, this is how the provider is initialized for testing:

```js
// legacy Waffle API
const provider = createMockProvider();

// new Waffle API
const provider = new MockProvider();
```

This initialization is already handled by `@nomiclabs/buidler-waffle`. Just be sure to include `usePlugin("@nomiclabs/buidler-waffle");` in your Buidler config and use the plugin's provider like this

```js
const provider = waffle.provider;
```

Run your tests with `npx buidler test` and you should get stack traces when a transaction fails.

[buidler evm]: ../buidler-evm/README.md


[Buidler Runtime Environment]: /documentation/#buidler-runtime-environment-bre
