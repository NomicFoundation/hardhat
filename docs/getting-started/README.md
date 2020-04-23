## Overview

Buidler is a task runner that facilitates building Ethereum smart contracts. It helps developers manage and automate the recurring tasks that are inherent to the process of building smart contracts, as well as easily introducing more functionality around this workflow. This means compiling and testing at the very core.

Buidler is designed around the concepts of **tasks** and **plugins**. Every time you're running Buidler from the CLI you're running a task. E.g. `npx buidler compile` is running the `compile` task.

The bulk of Buidler's functionality comes from plugins, which as a developer you're free to choose the ones you want to use. Buidler is unopinionated in terms of what tools you end up using, but it does come with some built-in defaults. All of which can be overriden.

Tasks can call other tasks, allowing complex workflows to be defined. Users and plugins can override existing tasks, making those workflows customizable and extendable.

## Installation

### Local installation (recommended)

The recommended way of using Buidler is through a local installation in your project. This way your environment will be reproducible and you will avoid future version conflicts. To use it in this way you will need to prepend `npx` to run it (i.e. `npx buidler`). To install locally initialize your `npm` project using `npm init` and follow the instructions. Once ready run:

    npm install --save-dev @nomiclabs/buidler

### Global installation

Be careful about inconsistent behavior across different projects that use different Buidler versions.

    npm install --global @nomiclabs/buidler
    
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

👷 Welcome to Buidler v1.0.0 👷‍‍

? What do you want to do? …
❯ Create a sample project
  Create an empty buidler.config.js
  Quit
```

Let’s create the sample project and go through the steps to try out the sample task and compile, test and deploy the sample contract. 

The sample project will ask you to install `buidler-waffle` and `buidler-ethers`, which makes Buidler compatible with tests built with Waffle. You can learn more about it [in this guide](../guides/waffle-testing.md). 

::: tip
Buidler will let you know how, but in case you missed it you can install them with `npm install --save-dev @nomiclabs/buidler-waffle ethereum-waffle chai @nomiclabs/buidler-ethers ethers`
:::

### Running tasks

To first get a quick sense of what's available and what's going on, run `npx buidler` in your project folder:

```
$ npx buidler
Buidler version 1.0.0

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message.
  --network             The network to connect to. (default: "buidlerevm")
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

To get help for a specific task run: npx buidler help [task]
```

This is the list of built-in tasks, and the sample `accounts` task. Further ahead, when you start using plugins to add more functionality, tasks defined by those will also show up here. This is your starting point to find out what tasks are available to run. 

If you take a look at `buidler.config.js`, you will find the definition of the task `accounts`:

<<< @/../packages/buidler-core/sample-project/buidler.config.js{5-11}

To run it, try `npx buidler accounts`:

```
$ npx buidler accounts
0xc783df8a850f42e7F7e57013759C285caa701eB6
0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4
0xE5904695748fe4A84b40b3fc79De2277660BD1D3
0x92561F28Ec438Ee9831D00D1D59fbDC981b762b2
0x2fFd013AaA7B5a7DA93336C2251075202b33FB2B
0x9FC9C2DfBA3b6cF204C37a5F690619772b926e39
0xFbC51a9582D031f2ceaaD3959256596C5D3a5468
0x84Fae3d3Cba24A97817b2a18c2421d462dbBCe9f
0xfa3BdC8709226Da0dA13A4d904c8b66f16c3c8BA
0x6c365935CA8710200C7595F0a72EB6023A7706Cd
0xD7de703D9BBC4602242D0f3149E5fFCD30Eb3ADF
0x532792B73C0C6E7565912E7039C59986f7E1dD1f
0xEa960515F8b4C237730F028cBAcF0a28E7F45dE0
0x3d91185a02774C70287F6c74Dd26d13DFB58ff16
0x5585738127d12542a8fd6C71c19d2E4CECDaB08a
0x0e0b5a3F244686Cf9E7811754379B9114D42f78B
0x704cF59B16Fd50Efd575342B46Ce9C5e07076A4a
0x0a057a7172d0466AEF80976D7E8c80647DfD35e3
0x68dfc526037E9030c8F813D014919CC89E7d4d74
0x26C43a1D431A4e5eE86cD55Ed7Ef9Edf3641e901
```

### Compiling your contracts

Next, if you take a look at `contracts/`, you should be able to find `Greeter.sol:`

<<< @/../packages/buidler-core/sample-project/contracts/Greeter.sol

To compile it, simply run:

```bash
npx buidler compile
```

### Testing your contracts

The sample project comes with these tests that use [`@ethereum-waffle`](https://www.npmjs.com/package/ethereum-waffle) and 
[ethers.js](https://github.com/ethers-io/ethers.js/). You can use other libraries if you want, check the integrations described in our guides.

<<< @/../packages/buidler-core/sample-project/test/sample-test.js

You can run your tests with `npx buidler test`

```
$ npx buidler test
Compiling...
Compiled 1 contract successfully


  Contract: Greeter
    ✓ Should return the new greeting once it's changed (762ms)

  1 passing (762ms)
```

### Deploying your contracts

Next, to deploy the contract we will use a Buidler script. 
Create a file `deploy.js` in `scripts/` with the following code:

<<< @/../packages/buidler-core/sample-project/scripts/sample-script.js

And run it with `npx buidler run scripts/deploy.js`:
```
$ npx buidler run scripts/deploy.js
All contracts have already been compiled, skipping compilation.
Greeter deployed to: 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F
```

Congrats! You have created a project, ran a Buidler task, compiled a smart contract, installed a Waffle integration plugin, wrote and ran a test using the Waffle and ethers.js plugins, and deployed a contract.

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).
