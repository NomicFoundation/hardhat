---
title: Documentation
description: Documentation about Hardhat, the Ethereum development environment
---

:::tip

**🚀 Hardhat 3 alpha release is out!**

This new major version introduces Solidity tests, a rewrite of performance critical components in Rust, adds multichain support across the board, implements OP Stack simulation, revamps the build system, modernizes our TS CLI and plugin system, and a lot more.

Hardhat 3 is a complete overhaul. This is an alpha release and there’s still a lot of work ahead towards stability, but you can already take it for a spin. [Learn more.](/hardhat3-alpha)

:::


Hardhat is a development environment for Ethereum software. It consists of different components for editing, compiling, debugging and deploying your smart contracts and dApps, all of which work together to create a complete development environment.

To get started check out these sections:

- [General overview](/hardhat-runner)
- [Quick start guide](/hardhat-runner/docs/getting-started/index.md#quick-start)
- [Step-by-step tutorial](/tutorial)

## Browse by component

:::tip

If you are in doubt about which component you are looking for, you can start [here.](/hardhat-runner)

:::

### Hardhat Runner

Hardhat Runner is the main component you interact with when using Hardhat. It's a flexible and extensible task runner that helps you manage and automate the recurring tasks inherent to developing smart contracts and dApps. [Learn more.](/hardhat-runner)

### Hardhat Network

Hardhat comes built-in with Hardhat Network, a local Ethereum network node designed for development. It allows you to deploy your contracts, run your tests and debug your code, all within the confines of your local machine. [Learn more.](/hardhat-network)

### Hardhat Ignition

Hardhat Ignition is a declarative deployment system that enables you to deploy your smart contracts without navigating the mechanics of the deployment process. [Learn more.](/ignition)

### Hardhat for Visual Studio Code

Hardhat for Visual Studio Code is a VS Code extension that adds language support for Solidity and provides editor integration for Hardhat projects. [Learn more.](/hardhat-vscode)

### Hardhat Chai Matchers

Hardhat Chai Matchers adds Ethereum-specific capabilities to the [Chai](https://www.chaijs.com/) assertion library, making your smart contract tests easy to write and read. Among other things, you can assert that a contract fired certain events, or that it exhibited a specific revert, or that a transaction resulted in specific changes to a wallet's Ether or token balance. [Learn more.](/hardhat-chai-matchers)

### Hardhat Network Helpers

Hardhat Network Helpers provides a convenient JavaScript interface to the JSON-RPC functionality of Hardhat Network. [Learn more.](/hardhat-network-helpers)
