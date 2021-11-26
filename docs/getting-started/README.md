## Overview

Hardhat is a development environment to compile, deploy, test, and debug your Ethereum software. It helps developers manage and automate the recurring tasks that are inherent to the process of building smart contracts and dApps, as well as easily introducing more functionality around this workflow. This means compiling, running and testing smart contracts at the very core.

Hardhat comes built-in with Hardhat Network, a local Ethereum network designed for development. Its functionality focuses around Solidity debugging, featuring stack traces, `console.log()` and explicit error messages when transactions fail.

Hardhat Runner, the CLI command to interact with Hardhat, is an extensible task runner. It's designed around the concepts of **tasks** and **plugins**. Every time you're running Hardhat from the CLI you're running a task. E.g. `npx hardhat compile` is running the built-in `compile` task. Tasks can call other tasks, allowing complex workflows to be defined. Users and plugins can override existing tasks, making those workflows customizable and extendable.

A lot of Hardhat's functionality comes from plugins, and, as a developer, you're free to choose which ones you want to use. Hardhat is unopinionated in terms of what tools you end up using, but it does come with some built-in defaults. All of which can be overriden.

## Installation

Hardhat is used through a local installation in your project. This way your environment will be reproducible, and you will avoid future version conflicts.

To install it, you need to create an npm project by going to an empty folder, running `npm init`, and following its instructions. Once your project is ready, you should run

```
npm install --save-dev hardhat
```

To use your local installation of Hardhat, you need to use `npx` to run it (i.e. `npx hardhat`).

## Quick Start

This guide will explore the basics of creating a Hardhat project.

A barebones installation with no plugins allows you to create your own tasks, compile your Solidity code, run your tests and run Hardhat Network, a local development network you can deploy your contracts to.

To create your Hardhat project run `npx hardhat` in your project folder:

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

Welcome to Hardhat v2.0.8

? What do you want to do? …
❯ Create a sample project
  Create an empty hardhat.config.js
  Quit
```

Let’s create the sample project and go through these steps to try out the sample task and compile, test and deploy the sample contract.

The sample project will ask you to install `hardhat-waffle` and `hardhat-ethers`, which makes Hardhat compatible with tests built with Waffle. You can learn more about it [in this guide](../guides/waffle-testing.md).

::: tip

Hardhat will let you know how, but, in case you missed it, you can install them with `npm install --save-dev @nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers`

:::

### Running tasks

To first get a quick sense of what's available and what's going on, run `npx hardhat` in your project folder:

```
$ npx hardhat
Hardhat version 2.0.8

Usage: hardhat [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Hardhat config file.
  --emoji               Use emoji in messages.
  --help                Shows this message, or a task's help if its name is provided
  --max-memory          The maximum amount of memory that Hardhat can use.
  --network             The network to connect to.
  --show-stack-traces   Show stack traces.
  --tsconfig            A TypeScript config file.
  --verbose             Enables Hardhat verbose logging
  --version             Shows hardhat's version.


AVAILABLE TASKS:

  accounts      Prints the list of accounts
  check         Check whatever you need
  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a hardhat console
  flatten       Flattens and prints contracts and their dependencies
  help          Prints this message
  node          Starts a JSON-RPC server on top of Hardhat Network
  run           Runs a user-defined script after compiling the project
  test          Runs mocha tests

To get help for a specific task run: npx hardhat help [task]
```

This is the list of built-in tasks, and the sample `accounts` task. Further ahead, when you start using plugins to add more functionality, tasks defined by those will also show up here. This is your starting point to find out what tasks are available to run.

If you take a look at the `hardhat.config.js` file, you will find the definition of the task `accounts`:

<<< @/../packages/hardhat-core/sample-projects/basic/hardhat.config.js{5-11}

To run it, try `npx hardhat accounts`:

```
$ npx hardhat accounts
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
0x70997970C51812dc3A010C7d01b50e0d17dc79C8
0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
0x90F79bf6EB2c4f870365E785982E1f101E93b906
0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
0x976EA74026E726554dB657fA54763abd0C3a0aa9
0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
0xBcd4042DE499D14e55001CcbB24a551F3b954096
0x71bE63f3384f5fb98995898A86B02Fb2426c5788
0xFABB0ac9d68B0B445fB7357272Ff202C5651694a
0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec
0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097
0xcd3B766CCDd6AE721141F452C550Ca635964ce71
0x2546BcD3c84621e976D8185a91A922aE77ECEc30
0xbDA5747bFD65F08deb54cb465eB87D40e51B197E
0xdD2FD4581271e230360230F9337D5c0430Bf44C0
0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
```

::: warning

_Do not send mainnet Ether to the addresses above._ Those addresses are deterministic: they are the same for _all_ Hardhat users. Accordingly, the private keys for these addresses are well known, so there are probably bots monitoring those addresses on mainnet, waiting to withdraw any funds sent to them. If you add any of these accounts to a wallet (eg Metamask), be very careful to avoid sending any mainnet Ether to them: consider naming the account something like "Hardhat - Unsafe" in order to prevent any mistakes.

:::

### Compiling your contracts

Next, if you take a look at `contracts/`, you should be able to find `Greeter.sol`:

<<< @/../packages/hardhat-core/sample-projects/basic/contracts/Greeter.sol

To compile it, simply run:

```
npx hardhat compile
```

### Testing your contracts

The sample project comes with these tests that use [Waffle](https://getwaffle.io/) and [Ethers.js](https://github.com/ethers-io/ethers.js/). You can use other libraries if you want. Check the integrations described in our guides.

If you take a look at `test/`, you should be able to find `sample-test.js`:

<<< @/../packages/hardhat-core/sample-projects/basic/test/sample-test.js

You can run your tests with `npx hardhat test`

```
$ npx hardhat test
Compiling 1 file with 0.7.3
Compilation finished successfully


  Greeter
Deploying a Greeter with greeting: Hello, world!
Changing greeting from 'Hello, world!' to 'Hola, mundo!'
    ✓ Should return the new greeting once it's changed (803ms)


  1 passing (805ms)
```

### Deploying your contracts

Next, to deploy the contract we will use a Hardhat script. Inside `scripts/` you will find `sample-script.js` with the following code:

<<< @/../packages/hardhat-core/sample-projects/basic/scripts/sample-script.js

Run it with `npx hardhat run scripts/sample-script.js`:

```
$ npx hardhat run scripts/sample-script.js
Deploying a Greeter with greeting: Hello, Hardhat!
Greeter deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Connecting a wallet or Dapp to Hardhat Network

Hardhat will always spin up an in-memory instance of Hardhat Network on startup by default. It's also possible to run Hardhat Network in a standalone fashion so that external clients can connect to it. This could be MetaMask, your Dapp front-end, or a script.

To run Hardhat Network in this way, run `npx hardhat node`:

```
$ npx hardhat node
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

This will expose a JSON-RPC interface to Hardhat Network. To use it connect your wallet or application to `http://localhost:8545`.

If you want to connect Hardhat to this node to, for example, run a deployment script against it, you simply need to run it using `--network localhost`.

To try this, start a node with `npx hardhat node` and re-run the sample script using the `network` option:

```
npx hardhat run scripts/sample-script.js --network localhost
```

---

Congrats! You have created a project, run a Hardhat task, compiled a smart contract, installed a Waffle integration plugin, written and run a test using the Waffle and ethers.js plugins, and deployed a contract.

For any questions or feedback you may have, you can find us in the [Hardhat Discord server](https://hardhat.org/discord).
