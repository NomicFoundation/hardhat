---
title: Getting started with Hardhat
description: Getting started with Hardhat, a development environment to compile, deploy, test, and debug your Ethereum software
---

## Overview

Hardhat is a development environment for Ethereum software. It consists of different components for editing, compiling, debugging and deploying your smart contracts and dApps, all of which work together to create a complete development environment.

Hardhat Runner is the main component you interact with when using Hardhat. It's a flexible and extensible task runner that helps you manage and automate the recurring tasks inherent to developing smart contracts and dApps.

Hardhat Runner is designed around the concepts of **tasks** and **plugins**. Every time you're running Hardhat from the command-line, you're running a task. For example, `npx hardhat compile` runs the built-in `compile` task. Tasks can call other tasks, allowing complex workflows to be defined. Users and plugins can override existing tasks, making those workflows customizable and extendable.

This guide will take you through the installation of our recommended setup, but as most of Hardhat's functionality comes from plugins, you are free to customize it or choose a completely different path.

## Installation

:::tip

[Hardhat for Visual Studio Code](/hardhat-vscode) is the official Hardhat extension that adds advanced support for Solidity to VSCode. If you use Visual Studio Code, give it a try!

:::

Hardhat is used through a local installation in your project. This way your environment will be reproducible, and you will avoid future version conflicts.

To install it, you need to create an npm project by going to an empty folder, running `npm init`, and following its instructions. You can use another package manager, like yarn, but we recommend you use npm 7 or later, as it makes installing Hardhat plugins simpler.

Once your project is ready, you should run

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```
npm install --save-dev hardhat
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev hardhat
```

:::

:::tab{value=yarn}

```
yarn add --dev hardhat
```

:::

::::

To use your local installation of Hardhat, you need to use `npx` to run it (i.e. `npx hardhat`).

## Quick Start

:::tip

If you are using Windows, we **strongly recommend** using [WSL 2](https://docs.microsoft.com/en-us/windows/wsl/about) to follow this guide.

:::

We will explore the basics of creating a Hardhat project with a sample contract, tests of that contract, and a script to deploy it.

To create the sample project, run `npx hardhat` in your project folder:

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

👷 Welcome to Hardhat v2.9.9 👷‍

? What do you want to do? …
❯ Create a JavaScript project
  Create a TypeScript project
  Create an empty hardhat.config.js
  Quit
```

Let’s create the JavaScript or TypeScript project and go through these steps to compile, test and deploy the sample contract. We recommend using TypeScript, but if you are not familiar with it just pick JavaScript.

### Running tasks

To first get a quick sense of what's available and what's going on, run `npx hardhat` in your project folder:

```
$ npx hardhat
Hardhat version 2.9.9

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

  check                 Check whatever you need
  clean                 Clears the cache and deletes all artifacts
  compile               Compiles the entire project, building all artifacts
  console               Opens a hardhat console
  coverage              Generates a code coverage report for tests
  flatten               Flattens and prints contracts and their dependencies
  help                  Prints this message
  node                  Starts a JSON-RPC server on top of Hardhat Network
  run                   Runs a user-defined script after compiling the project
  test                  Runs mocha tests
  typechain             Generate Typechain typings for compiled contracts
  verify                Verifies contract on Etherscan

To get help for a specific task run: npx hardhat help [task]
```

The list of available tasks includes the built-in ones and also those that came with any installed plugins. `npx hardhat` is your starting point to find out what tasks are available to run.

### Compiling your contracts

Next, if you take a look in the `contracts/` folder, you'll see `Lock.sol`:

<<< @/../packages/hardhat-core/sample-projects/javascript/contracts/Lock.sol

To compile it, simply run:

```
npx hardhat compile
```

If you created a TypeScript project, this task will also generate TypeScript bindings using [TypeChain](https://www.npmjs.com/package/typechain).

### Testing your contracts

Your project comes with tests that use [Mocha](https://mochajs.org), [Chai](https://www.chaijs.com), and [Ethers.js](https://docs.ethers.io/v5).

If you take a look in the `test/` folder, you'll see a test file:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

<<< @/../packages/hardhat-core/sample-projects/typescript/test/Lock.ts

:::

:::tab{value="JavaScript"}

<<< @/../packages/hardhat-core/sample-projects/javascript/test/Lock.js

:::

::::

You can run your tests with `npx hardhat test`:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```
$ npx hardhat test
Generating typings for: 2 artifacts in dir: typechain-types for target: ethers-v5
Successfully generated 6 typings!
Compiled 2 Solidity files successfully


  Lock
    Deployment
      ✔ Should set the right unlockTime (610ms)
      ✔ Should set the right owner
      ✔ Should receive and store the funds to lock
      ✔ Should fail if the unlockTime is not in the future
    Withdrawals
      Validations
        ✔ Should revert with the right error if called too soon
        ✔ Should revert with the right error if called from another account
        ✔ Shouldn't fail if the unlockTime has arrived and the owner calls it
      Events
        ✔ Should emit an event on withdrawals
      Transfers
        ✔ Should transfer the funds to the owner


  9 passing (790ms)
```

:::

:::tab{value="JavaScript"}

```
$ npx hardhat test
Compiled 2 Solidity files successfully


  Lock
    Deployment
      ✔ Should set the right unlockTime (610ms)
      ✔ Should set the right owner
      ✔ Should receive and store the funds to lock
      ✔ Should fail if the unlockTime is not in the future
    Withdrawals
      Validations
        ✔ Should revert with the right error if called too soon
        ✔ Should revert with the right error if called from another account
        ✔ Shouldn't fail if the unlockTime has arrived and the owner calls it
      Events
        ✔ Should emit an event on withdrawals
      Transfers
        ✔ Should transfer the funds to the owner


  9 passing (790ms)
```

:::

::::

### Deploying your contracts

Next, to deploy the contract we will use a Hardhat script.

Inside the `scripts/` folder you will find a file with the following code:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

<<< @/../packages/hardhat-core/sample-projects/typescript/scripts/deploy.ts

:::

:::tab{value="JavaScript"}

<<< @/../packages/hardhat-core/sample-projects/javascript/scripts/deploy.js

:::

::::

You can run it using `npx hardhat run`:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```
$ npx hardhat run scripts/deploy.ts
Lock with 1 ETH deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

:::

:::tab{value="JavaScript"}

```
$ npx hardhat run scripts/deploy.js
Lock with 1 ETH deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

:::

::::

### Connecting a wallet or Dapp to Hardhat Network

By default, Hardhat will spin up a new in-memory instance of Hardhat Network on startup. It's also possible to run Hardhat Network in a standalone fashion so that external clients can connect to it. This could be a wallet, your Dapp front-end, or a script.

To run Hardhat Network in this way, run `npx hardhat node`:

```
$ npx hardhat node
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

This will expose a JSON-RPC interface to Hardhat Network. To use it connect your wallet or application to `http://127.0.0.1:8545`.

If you want to connect Hardhat to this node, for example to run a deployment script against it, you simply need to run it using `--network localhost`.

To try this, start a node with `npx hardhat node` and re-run the deployment script using the `network` option:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```
npx hardhat run scripts/deploy.ts --network localhost
```

:::

:::tab{value="JavaScript"}

```
npx hardhat run scripts/deploy.js --network localhost
```

:::

::::

Congrats! You have created a project and compiled, tested and deployed a smart contract.

Show us some love by starring [our repository on GitHub!](https://github.com/NomicFoundation/hardhat)️
