# Migrating from Truffle

Hardhat is a task runner that facilitates building Ethereum smart contracts. It helps developers manage and automate the recurring tasks that are inherent to the process of building smart contracts, as well as easily introducing more functionality around this workflow. This means compiling and testing at the very core.

The bulk of Hardhat's functionality comes from plugins, and as a developer you're free to choose the ones you want to use. There are plugins for Truffle 4 and 5 that make migrating to Hardhat easy.

To migrate an existing Truffle project to Hardhat there are two main things to consider: testing and deployment.

### Testing

When it comes to unit tests, there are two Hardhat plugins that support the Truffle testing APIs: `hardhat-truffle4` and `hardhat-truffle5`. Using these you can run your existing tests with Hardhat.

If you want to learn the details of writing Truffle tests to run in Hardhat, then you can read [this guide](./truffle-testing.md), but it's not necessary in order to migrate your existing test suite.

#### Migrations and hardhat-truffle fixtures

If your project uses [Truffle Migrations](https://www.trufflesuite.com/docs/truffle/getting-started/running-migrations) to initialize your testing environment (i.e. your tests call `Contract.deployed()`), then there's some more work to do to be able to run your tests.

The Truffle plugins currently don't fully support Migrations. Instead, you need to adapt your Migrations to become a hardhat-truffle fixture. This file, located at `test/truffle-fixture.js`, deploys your contracts and calls the `setAsDeployed()` method on each of the contract abstractions you want to test.

For example, this migration:

```js
const Greeter = artifacts.require("Greeter");

module.exports = function (deployer) {
  deployer.deploy(Greeter);
};
```

should become this hardhat-truffle fixture:

```js
const Greeter = artifacts.require("Greeter");

module.exports = async () => {
  const greeter = await Greeter.new();
  Greeter.setAsDeployed(greeter);
};
```

These fixtures will run on Mocha's `before`, which runs before each `contract()` function runs, just like Truffle migrations do.

If you have multiple migrations, you don't need to create multiple hardhat-truffle fixture files. You can deploy all your contracts from the same one.

Once you've written your hardhat-truffle fixtures for your migrations and completed your setup you can run your tests with `npx hardhat test`. Take a look at the [Truffle testing guide](/guides/truffle-testing.md) to learn more about using Truffle with Hardhat.

### Deployment

When it comes to deploying, there are no official plugins that implement a deployment system for Hardhat yet, but there's [an open issue](https://github.com/nomiclabs/hardhat/issues/381) with some ideas and we'd value your opinion on how to best design it.

In the meantime, we recommend [deploying your smart contracts using scripts](../guides/deploying.md), or using [the hardhat-deploy community plugin](https://github.com/wighawag/hardhat-deploy/tree/master).

### Truffle 4 and Web3.js' synchronous calls

Truffle 4 uses Web3.js `0.20.x`, which supports doing synchronous calls. These aren't supported by the `hardhat-web3-legacy` plugin, which is the plugin that integrates Web3.js `0.20.x`.

Instead, you should use the promisified version of Web3.js offered by the plugin: `pweb3`. It's available as a global variable in your tests and tasks, and in the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md). It has the same API as Web3.js, but asynchronous operations return promises.

For example, this code:

```js
console.log(web3.eth.accounts);
```

should become:

```js
console.log(await web3.eth.getAccounts());
```

For any help or feedback you may have, you can find us in the [Hardhat Support Discord server](https://hardhat.org/discord).
