## Overview

Buidler is a task runner that facilitates building Ethereum smart contracts. It helps developer manage and automate the recurring tasks that are inherent to the process of building smart contracts, as well as easily introducing more functionality around this workflow. This means compiling and testing at the very core.

Buidler is designed around the concepts of **tasks** and **plugins**. Every time you're running Buidler from the CLI you're running a task. E.g. `npx buidler compile` is running the `compile` task.

The bulk of Buidler's functionality comes from plugins, which as a developer you're free to choose the ones you want to use. Buidler is unopinionated in terms of what tools you end up using, but it does come with some built-in defaults. All of which can be overriden.

Tasks can call other tasks, allowing complex workflows to be defined. Users and plugins can override existing tasks, making those workflows customizable and extendable.

## Installation

### Local installation (recommended)

The recommended way of using Buidler is through a local installation in your project. This way your environment will be reproducible and you will avoid future version conflicts. To use it in this way you will need to prepend `npx` to run it (i.e. `npx buidler`). To install locally initialize your `npm` project using `npm init` and follow the instructions. Once ready run:

    npm install --save-dev @nomiclabs/buidler

### Global installation

Be careful about inconsistent behavior across different projects that use different Buidler versions.

    npm -g install @nomiclabs/buidler
    
If you choose to install Buidler globally, you have to do the same for its plugins and their dependencies.

## Quick Start

This guide will explore the basics of creating a Buidler project.

A barebones installation with no plugins allows you to compile your Solidity code, install plugins and create your own tasks.

To create your Buidler project run `npx buidler` in your project folder:

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

👷 Welcome to Buidler v1.0.0-beta.10 👷‍‍

? What do you want to do? …
❯ Create a sample project
  Create an empty buidler.config.js
  Quit
```

Let’s create the sample project and go through the steps to try out the sample task and compile, test and deploy the sample contract.

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

_NOTE: in the Buidler 1.0.0 beta release we’ve disabled the automatic ganache instance feature to keep working on its stability, so you’ll need to run it manually. This feature will be back by the time we ship the stable release. Please install `npm install ganache-cli` and run `ganache-cli` in a separate terminal to keep going._

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

Now, you’ll likely want to run some tests. Let’s install `buidler-truffle5` and try out the Truffle integration. Truffle depends on web3.js, so we'll need to install the web3.js plugin and the library proper as well:

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

Next, to deploy the contract we will use the Truffle plugin again. Create a file `deploy.js` in `scripts/` with the following code:

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

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).