## Overview
Buidler is designed around the concepts of _tasks_, and the _Buidler Runtime Environment_: a set of functionality to create tasks. This document describes both concepts in detail.

If you want to write your own tasks, create plugins, or want to understand Buidler internals, keep reading.

### Tasks

Buidler helps smart contract developers automate their workflow by letting them run and create tasks. Tasks can call other tasks, allowing complex workflows to be defined. Users and plugins can override existing tasks, making those workflows customizable and extendable.

A task is a JavaScript async function with some associated metadata. This metadata is used by Buidler to automate some things for you. Arguments parsing, validation, and help messages are taken care of.

### Buidler Runtime Environment (BRE)

The Buidler Runtime Environment, or BRE for short, is an object containing all the functionality that Buidler exposes when running a task, test or script. In reality, Buidler _is_ the BRE. 

When you require Buidler (`const buidler = require("@nomiclabs/buidler")`) you're getting an instance of the BRE. 

During initialization, the Buidler configuration file essentially constructs a list of things to be added to the BRE. This includes tasks, configs and plugins. Then when tasks, tests or scripts run, the BRE is always present and available to access anything that is contained in it.

The BRE has a role of centralizing coordination across all Buidler components. This architecture allows for plugins to inject functionality that becomes available everywhere the BRE is accessible.

Check out the [Using the Buidler Runtime Environment (BRE)](#using-the-buidler-runtime-environment-bre) section for more information on how to use it.

## Quick Start

In this guide, we’ll explore how to start using Buidler in your Ethereum project.

**What makes Buidler special? What can you achieve with it?**

Buidler allows you to streamline your development workflow by making it easy to incorporate other tools into your process, as well as granting you all the flexibility you need to adapt the tools to your exact needs. What dependencies and tools you use is up to you. Buidler will only help you orchestrate them.

Out of the box, you can compile your Solidity code, install plugins and create your own tasks.

Let’s install it to try it out:

```bash
npm install @nomiclabs/buidler
```

To create a Buidler project just run `npx buidler` in your project folder:

![](https://cdn-images-1.medium.com/max/1600/1*Ri6bdhh0eIJTJT31dy6DhQ.png)

Let’s create the sample project and go through the steps to try out the sample task, compile, test and deploy the sample contract.

To first get a quick sense of what's available and what's going on, run `npx buidler` in your project folder:
```
$ npx buidler
Buidler version 1.0.0-beta.10

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message.
  --network             The network to connect to. (default: "develop")
  --show-stack-traces   Show stack traces.
  --version             Shows buidler's version.


AVAILABLE TASKS:

  accounts      Prints a list of the available accounts
  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a buidler console
  flatten       Flattens and prints all contracts and their dependencies
  help          Prints this message
  run           Runs a user-defined script after compiling the project
  test          Runs mocha tests

To get help for a specific task run: buidler help [task]
```

This is the list of built-in tasks, and the sample `accounts` task. Further ahead, when you start using plugins to add more functionality, tasks defined by those will also show up here. This is your starting point to find out what tasks are available to run. 

If you take a look at `buidler.config.js`, you will find the definition of the task `accounts`:

```js
task("accounts", "Prints a list of the available accounts", async () => {
  const accounts = await ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
});

module.exports = {};
```

_NOTE: in the Buidler 1.0.0 beta release we’ve disabled the automatic ganache instance feature to keep working on its stability, so you’ll need to run it manually. This feature will be back by the time we ship the stable release. Please run `ganache-cli` in a separate terminal to keep going._

To run it, try `npx buidler accounts`:

```
$ npx buidler accounts
Accounts: [ '0x9d6bd5939d6e2629f2bdffac5417ba22e31ea6a5',
  '0xdb981036cf05c2219121c778578300cc6b91bd34',
  '0xdc66201940a7ced201b1e4ed9fa72047fa029dc1',
  '0x6a0ead959f30e51e86bb2285ab5e36a68ac22d98',
  '0x9bc40d79da06d28d57982eb9e40cd0ba095cdae8',
  '0xcff265234958dfe27e7e1bbfcbd253ac4882bcae',
  '0x13447a4658db5f9bdab4f82656958b7688c4435f',
  '0x7dce2d4229cb4ccbcd050ffe7bc405d936314a73',
  '0x2f52b335f53f16a5d9727da8d2231923fa04f0c5',
  '0x23024feafd6587ef4576496484fee2796ba66e3c' ]
```

You will learn how to create your own tasks in the [next guide](/guides/create-task.md).

Next, if you take a look at `contracts/`, you should be able to find `Greeter.sol:`

```js
pragma solidity ^0.5.1;

contract Greeter {

    string greeting;

    constructor(string memory _greeting) public {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

}
```

To compile it, simply run:

```bash
npx buidler compile
```

Now, you’ll likely want to run some tests. Let’s install `buidler-truffle5` and test out the Truffle integration:

```bash
npm install @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3 web3
```

Add `usePlugin("@nomiclabs/buidler-truffle5")` to the top of your `buidler.config.js`, so that it looks like this:
```js
usePlugin("@nomiclabs/buidler-truffle5")

task("accounts", "Prints a list of the available accounts", async () => {
  const accounts = await ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
});

module.exports = {};
```

Change `test/sample-test.js` to:

```js
const assert = require("assert");

describe("Ethereum provider", function() {
  it("Should return the accounts", async function() {
    const accounts = await ethereum.send("eth_accounts");
    assert(accounts.length !== 0, "No account was returned");
  });
});

contract("Greeter", function() {
  it("Should give the correct greeting", async function() {
    const Greeter = artifacts.require("Greeter");
    const greeter = await Greeter.new("Hello, Buidler!");

    assert.equal(await greeter.greet(), "Hello, Buidler!");
  });
});
```

And run `npx buidler test`

```
$ npx buidler test
Compiling...
Compiled 1 contract successfully


  Ethereum provider
    ✓ Should return the accounts

  Greeter
    ✓ Should give the correct greeting (376ms)


  2 passing (383ms)
```

Next, to deploy the contract we will use the Truffle plugin again. Create a file `deploy.js` in `scripts/`:

```js
async function main() {
  const Greeter = artifacts.require("Greeter");

  const greeter = await Greeter.new("Hello, Buidler!");
  console.log("Greeter deployed to:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```
And run it with `npx buidler run scripts/deploy.js`:
```
$ npx buidler run scripts/deploy.js
All contracts have already been compiled, skipping compilation.
Greeter deployed to: 0x080f632fB4211CFc19d1E795F3f3109f221D44C9
```

Congrats! You have created a project, ran a Buidler task, compiled a smart contract, installed a Truffle integration plugin, wrote and ran a test using the Truffle plugin, and deployed a contract.

These cover the basics to start using Buidler. Move on to the next section to learn more.

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).

## Installation

### Local installation (recommended)

The recommended way of using Buidler is through a local installation in your project. This way your environment will be reproducible and you will avoid future version conflicts. To use it in this way you will need to prepend `npx` to run it (i.e. `npx buidler`). To install locally initialize your `npm` project using `npm init` and follow the instructions. Once ready run:

    npm install --save-dev @nomiclabs/buidler

### Global installation

Be careful about inconsistent behavior across different projects that use different Buidler versions.

    npm -g install @nomiclabs/buidler
    
If you choose to install Buidler globally, you have to do the same for its plugins and their dependencies.

## Configuration

Buidler is exporting a JavaScript object from a `buidler.config.js` file, which, by default, lives in the root of your project.

The entirety of your Builder setup is contained in this file. Feel free to add any ad-hoc configs you may find useful for your project, just make sure to assign them to `module.exports` so they'll be accessible later on through the config object in the [Builder Runtime Environment](/documentation/#buidler-runtime-environment-bre).

An empty `builder.config.js` is enough for builder to work.

### Available config options

The exported config object can have the following entries: `defaultNetwork`, `networks`, `solc`, and `paths`. A complete configuration would look like this:

```js
module.exports = {
  defaultNetwork: "networkName",
  networks: {...},
  solc: {...},
  paths:{...}
}
```

### Networks configuration

The `networks` config field is an optional object where network names map to objects with the following fields:

- `url`: The url of the node. This argument is required for custom networks.
- `chainId`: An optional number, used to validate the network Buidler connects to. If not present, this validation is omitted.
- `from`: The address to use as default sender. If not present the first account of the node is used.
- `gas`: Its value should be `"auto"` or a number. If a number is used, it will be the gas limit used by default in every transaction. If `"auto"` is used, the gas limit will be automatically estimated. Default value: `"auto"`.
- `gasPrice`: Its value should be `"auto"` or a number. This parameter behaves like `gas`. Default value: `"auto"`.
- `gasMultiplier`: A number used to multiply the results of gas estimation to give it some slack due to the uncertainty of the estimation process. Default: `1`.
- `accounts`: This field controls which accounts Buidler uses. It can use the node's accounts (by setting it to `"remote"`), a list of local accounts (by setting it to an array of hex-encoded private keys), or use an HD Wallet (see below). Default value: `"remote"`.

You can customize which network is used by default when running Buidler by setting the config's `defaultNetwork` field. If you omit this config, its default value will be `"develop"`.

### HD Wallet config

To use an HD Wallet with Buidler you should set your network's `accounts` field to an object with the following fields:

- `mnemonic`: A required string with the mnemonic of the wallet.
- `path`: The HD parent of all the derived keys. Default value: `"m/44'/60'/0'/0"`.
- `initialIndex`: The initial index to derive. Default value: `0`.
- `count`: The number of accounts to derive. Default value: `10`.

### Default networks object

```js
develop: {
  url: "http://127.0.0.1:8545";
}
```

### Solc configuration

The `solc` config field is an optional object which can contain the following keys:

- `version`: The solc version to use. We recommend always setting this field. Default value: `"0.5.8"`.
- `optimizer`: An object with `enabled` and `runs` keys. Default value: `{ enabled: false, runs: 200 }`.
- `evmVersion`: A string controlling the target evm version. One of `"homestead"`, `"tangerineWhistle"`, `"spuriousDragon"`, `"byzantium"`, `"constantinople"`, and `"petersburg"`. Default value: managed by Solidity. Please, consult its documentation.

### Path configuration

You can customize the different paths that buidler uses by providing an object with the following keys:

- `root`: The root of the Buidler project. This path is resolved from the `buidler.config.js`'s directory. Default value: '.'.
- `sources`: The directory where your contract are stored. This path is resolved from the project's root. Default value: './contracts'.
- `tests`: The directory where your tests are located. This path is resolved from the project's root. Default value: './test'.

- `cache`: The directory used by Buidler to cache its internal stuff. This path is resolved from the project's root. Default value: './cache'.
- `artifacts`: The directory where the compilation artifacts are stored. This path is resolved from the project's root. Default value: './artifacts'.

## Quickly integrating other tools

Buidler's config file will always run before any task, so you can use it to integrate with other tools, like importing `@babel/register`.