# Migrating from Truffle

Hardhat is a task runner that facilitates building Ethereum smart contracts. It helps developers manage and automate the recurring tasks that are inherent to the process of building smart contracts, as well as easily introducing more functionality around this workflow. This means compiling and testing at the very core.

The bulk of Hardhat's functionality comes from plugins, and as a developer you're free to choose the ones you want to use. There are plugins for Truffle 4 and 5 that make migrating to Hardhat easy.

To migrate an existing Truffle project to Hardhat you need to install the proper dependencies and adapt three parts of your project: the configuration, the tests, and the deployments.

### Installation

The first thing you need to do is to install Hardhat and the proper plugin. This guide assumes that you'll be using the `@nomiclabs/hardhat-truffle5` plugin.

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```
npm install --save-dev hardhat @nomiclabs/hardhat-truffle5
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev hardhat @nomiclabs/hardhat-truffle5 @nomiclabs/hardhat-web3 'web3@^1.0.0-beta.36'
```

:::

:::tab{value=yarn}

```
yarn add --dev hardhat @nomiclabs/hardhat-truffle5 @nomiclabs/hardhat-web3 'web3@^1.0.0-beta.36'
```

:::

::::

### Configuration

After installing the necessary dependencies, you need to create a `hardhat.config.js` file. This file is the equivalent of Truffle's `truffle-config.js` file, and it's where you configure Hardhat and its plugins. We'll be using JavaScript in this guide, but you can learn how to use Hardhat with TypeScript in [this guide](/hardhat-runner/docs/guides/typescript).

Create a `hardhat.config.js` file with the following contents:

```js
require("@nomiclabs/hardhat-truffle5");

module.exports = {
  solidity: {
    // ...
  },
  networks: {
    // ...
  },
};
```

We'll explain how to adapt the compiler and the networks configurations. For other entries in your `truffle-config.js` file, you can compare [Truffle's](https://trufflesuite.com/docs/truffle/reference/configuration/) and [Hardhat's](/hardhat-runner/docs/config) configuration references. Keep in mind that some features might not be portable.

#### Compiler configuration

The compiler configuration is the easiest to migrate. You just need to copy the content of the `compilers.solc` object from your `truffle-config.js` file to the `solidity` entry in your `hardhat.config.js` file. For example, if your Truffle config is:

```js
module.exports = {
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
```

then your Hardhat config should be:

```js
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
```

Keep in mind that only the `version` and `settings` keys are supported.

#### Network configuration

The network configuration is a bit more complex. You need to copy the content of the `networks` object from your `truffle-config.js` file to the `networks` entry in your `hardhat.config.js` file and adapt some fields. For example, if your Truffle config is:

```js
module.exports = {
  networks: {
    sepolia: {
      host: "http://sepolia.example.com",
      port: 8545,
      network_id: 11155111,
    },
  },
};
```

then your Hardhat config should be:

```js
module.exports = {
  networks: {
    sepolia: {
      url: "http://sepolia.example.com:8545",
      chainId: 11155111,
    },
  },
};
```

Again, not every field is supported. Compare the [Truffle config reference](https://trufflesuite.com/docs/truffle/reference/configuration/#networks) and the [Hardhat config reference](/hardhat-runner/docs/config#json-rpc-based-networks) to learn more.

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

When it comes to deploying, there are no official plugins that implement a deployment system for Hardhat yet. In the meantime, we recommend [deploying your smart contracts using scripts](../guides/deploying.md), or using [the hardhat-deploy community plugin](https://github.com/wighawag/hardhat-deploy/tree/master).

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
