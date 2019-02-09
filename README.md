![](https://cdn-images-1.medium.com/max/2600/1*EJWKycln-DOgq8bSzP0o9g.png)
[![NPM Package](https://img.shields.io/npm/v/@nomiclabs/buidler.svg?style=flat-square)](https://www.npmjs.org/package/@nomiclabs/buidler)
[![Build Status](https://travis-ci.com/nomiclabs/buidler.svg?branch=master)](https://travis-ci.com/nomiclabs/buidler)
[![Coverage Status](https://codecov.io/gh/nomiclabs/buidler/branch/master/graph/badge.svg)](https://codecov.io/gh/nomiclabs/buidler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
---------
Buidler is an extensible developer tool that helps Ethereum developers increase productivity by reliably bringing together the tools they want. Developed by [Nomic Labs](https://nomiclabs.io/) and funded by an Ethereum Foundation grant.

Buidler is:
* A task runner.
* Equipped with built-in tasks for compiling and testing your smart contracts.
* Fully extensible.
* Flexible and lean.
* Usable programmatically as a library.
* Equipped with an interactive console.
* Unopinionated. Choose your own libraries and tools.

Read [our announcement](https://medium.com/nomic-labs-blog/towards-a-mature-ecosystem-of-ethereum-developer-tools-bdff10e6cdc3) to know more about our vision for Buidler.

Join our read-only [Buidler News Telegram group](https://t.me/BuidlerNews) to stay up to date on new releases, plugins and tutorials.

## Installation
### Local installation (recommended)
The recommended way of using Buidler is through a local installation in your project. This way your environment will be reproducible and you will avoid future version conflicts.
To use it in this way you will need to prepend `npx` to run it (i.e. `npx buidler`).
To install locally initialize your `npm` project using `npm init` and follow the instructions. Once ready run:
```
npm install --save-dev @nomiclabs/buidler
```

### Global installation
Be careful about inconsistent behavior across different projects that use different Buidler versions.
```
npm -g install @nomiclabs/buidler
```

## Quick start
Just run `buidler` in your project root and follow the instructions to initialize a sample Buidler project.
Install one of the core plugins so you have a simple way to interact with your contracts through an Ethereum library.
For example to use Buidler’s Truffle 5 plugin, you should run:
```
npm install @nomiclabs/buidler-truffle5 web3@1.0.0-beta.37
```
And make your `buidler.config.js` file look like this:
```js
require("@nomiclabs/buidler-truffle5");

// You can define your own tasks in this file
task("balance", "Prints an account's balance")
  .addParam("account", "The account")
  .setAction(async ({ account }) => {
    account = web3.utils.toChecksumAddress(account);
    const balance = await web3.eth.getBalance(account);

    console.log(web3.utils.fromWei(balance, "ether"), "ETH");
  });

module.exports = {};

```
After that, all you need to know is that your contracts go in `<project-root>/contracts` and your tests in `<project-root>/tests`, as you would do with Truffle 5.
To compile and run your tests:
```
buidler compile
buidler test
```

and to test your task:
```
buidler balance --account 0x6bac6948840a018271a2c9d731c9677a14de9f0c
```

## Guides
To learn how to use Buidler in-depth refer to one of our guides:

* [How to get started with Buidler](https://medium.com/nomic-labs-blog/how-to-get-started-with-buidler-68beb6b9bb04)
* [How to migrate from Truffle](https://medium.com/nomic-labs-blog/migrating-from-truffle-4-or-5-to-buidler-8d5aec6e76aa)
* [How to create a Buidler plugin](https://medium.com/nomic-labs-blog/how-to-create-a-buidler-plugin-b60432bf6d75)
* [How to create a Buidler task](https://medium.com/nomic-labs-blog/how-to-create-a-buidler-task-55658aa89aff)

## Plugins
* [@nomiclabs/buidler-truffle4](https://github.com/nomiclabs/buidler-truffle4): integration with TruffleContract from Truffle 4.
* [@nomiclabs/buidler-truffle5](https://github.com/nomiclabs/buidler-truffle5): integration with TruffleContract from Truffle 5.
* [@nomiclabs/buidler-web3](https://github.com/nomiclabs/buidler-web3): injects the Web3 1.x module and a live instance into the Buidler Runtime Environment.
* [@nomiclabs/buidler-web3-legacy](https://github.com/nomiclabs/buidler-web3-legacy): injects the Web3 0.20.x module and a live instance into the Buidler Runtime Environment.
* [@nomiclabs/buidler-ethers](https://github.com/nomiclabs/buidler-ethers): injects ethers.js into the Buidler Runtime Environment.

## Testing your contracts
By default, you can write your tests using [mocha](https://mochajs.org/). Just put them in `<project-root>/test` and run them with `buidler test`. The [Buidler Runtime Environment](#Buidler-Runtime-Environment) will be available in the global scope.
You can also write your tests as ad-hoc scripts by requiring the [Buidler Runtime Environment](#Buidler-Runtime-Environment) just like with any other library. Read section [Using Buidler in your own scripts](#using-buidler-in-your-own-scripts) for more information.
If you’d like to use a different test runner or testing framework, you can override the test task or simply use Buidler programmatically from your test runner to enable that.

## Deploying your contracts
Deployments using Buidler are scripted. You can write a standalone [script that uses Buidler as a library](#using-scripts-in-your-own-scripts) (`node deploy.js`) or it can be a Buidler script (`buidler run deploy.js`).

Here’s a very simple example of a Buidler deployment script using [@nomiclabs/buidler-truffle5](https://github.com/nomiclabs/buidler-truffle5).

deploy.js:
```js
const Greeter = artifacts.require("Greeter");

async function deploy() {
  const greeter = await Greeter.new("Hello, Buidler!");
  console.log("Greeter address:", greeter.address);
}

deploy().catch(console.error);
```
`buidler run deploy.js`
 
## Configuration
`buidler.config.js` in the root of your project is the main config file. You can add any application-specific configurations you may need to this file, just make sure to assign your config to `module.exports` so it's accessible later on through the config object in the [Buidler Runtime Environment](#Buidler-Runtime-Environment).
An empty `buidler.config.js` is enough for Buidler to work. For a detailed specification of `buidler.config.js` take a look at [our wiki](https://github.com/nomiclabs/buidler/wiki/buidler.config.js-documentation).

## Quickly integrating other tools
Buidler's config file will always run before any task, so you can use it to integrate with other tools, like requiring `@babel/register` at the top.

## Buidler Runtime Environment
Whether you are writing a test, script or creating a new task, Buidler will always provide you with the same environment, which consists of an object with these properties:
* `config`: An object consisting of all of Buidler's configuration.
* `buidlerArguments`: An object with the arguments Buidler was run with.
* `run`: A function to execute any of Buidler's tasks.
* `ethereum`: an [EIP1193](https://eips.ethereum.org/EIPS/eip-1193) Ethereum provider.
## Using buidler in your own scripts
You can leverage Buidler's infrastructure and configuration in your own scripts.
By running them with `buidler run <path>` [the Buidler Runtime Environment](#Buidler-Runtime-Environment) will be initialized, making all of its properties globally available. Your contracts will be compiled before if necessary.

You can also build them as standalone scripts and run them directly without `buidler`, you just need to import the [Buidler Runtime Environment](#Buidler-Runtime-Environment) with `require("@nomiclabs/buidler")`. If you run them this way, you have to use environment variables to pass arguments directly to Buidler (e.g. `BUIDLER_NETWORK=develop`).

## Ethereum library
The way to interact with Ethereum on Buidler works the same as in dapp browsers, through an [EIP1193](https://eips.ethereum.org/EIPS/eip-1193) provider. This provider will handle gas limit, gas price, network validation and default sender for you. There are [plugins](#Plugins) available for the most used Ethereum libraries. Choose the one you like the most, or [write a plugin](https://medium.com/nomic-labs-blog/how-to-create-a-buidler-plugin-b60432bf6d75) to integrate a new one (it’s super easy!).

## Buidler compilation artifacts
The default artifact format consists of a json containing:
* `contractName`: a string with the name
* `abi`: the abi array
* `bytecode`: A hex (without `"0x"`) string of the unlinked deployment bytecode. If the contract is not deployable then this is an empty string.
* `linkReferences`: The link references object as returned by `solc-js`. If no link is present then this is an empty object.


## Notes on 1.0.0 beta release
We’re still working on the stability of the ganache integration to be able to get an instance running automatically when you run Buidler, so we’ve excluded it from this release. We will re-include this feature back into Buidler by the time we ship the first stable release.

Until then, to use the `develop` network locally you’ll need to install and manually run [ganache-cli](https://github.com/trufflesuite/ganache-cli):

```
npm install -g ganache-cli

ganache-cli
```


## Contributing
Contributions are always welcome! Feel free to open any issue or send a pull request.

## Feedback, help and news


[Buidler Support Telegram group](http://t.me/BuidlerSupport): for any questions or feedback you may have, you can find us here.

[Buidler News Telegram group](http://t.me/BuidlerNews): to remain up to date on Buidler releases, tutorials and news all around. Low-bandwith, read-only group.

[Follow Nomic Labs on Twitter.](https://twitter.com/nomiclabs)

## License
MIT

## Happy buidling!
👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️

