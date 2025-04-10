---
prev: false
---

# Differences with Hardhat 2

This document outlines the key improvements and new features introduced in Hardhat 3. While this list is long, most of these changes are backwards-compatible or easy to adapt to existing projects.

## Support for Solidity Tests

Hardhat 3 comes with Foundry-compatible Solidity tests, which are fast and ideal for unit testing. Writing integration tests in TypeScript is still supported and can be used alongside Solidity tests.

## Multichain support

Hardhat 2's development network always behaves like Ethereum Mainnet. Hardhat 3 removes this limitation, letting you choose which kind of chain you want to simulate. And, unlike Hardhat 2, you can configure multiple Hardhat networks, each with its own chain type.

The initial release includes first-class support for Ethereum Mainnet and OP Mainnet, providing more realistic simulations of these networks. We'll gradually add new chain types over time. In the meantime, a generic chain type can be used as a fallback for networks that are not yet supported. This generic chain type behaves the same as Hardhat Network in Hardhat 2 and works with all of Hardhat 3's new features.

## Network manager

A Hardhat 2 task has access to a single, fixed connection for its entire duration. In Hardhat 3, connections are managed explicitly, and tasks can create and use multiple connections simultaneously.

## ESM-first

Hardhat 3 embraces modern JavaScript by using [ECMAScript Modules (ESM)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default. Configuration files must now use ESM, although CommonJS (CJS) modules are still supported in scripts and tests.

## Test Runner Plugins

In Hardhat 2, JavaScript tests are always run with a bundled version of Mocha. In Hardhat 3, the test runner is just another plugin and you can choose which one to use.

Hardhat 3 provides official plugins for running tests: one for Mocha and one for [Node.js’s built-in test runner](https://nodejs.org/api/test.html) The recommended option is the Node.js test runner, because it's fast and has no external dependencies.

## Declarative Configuration

Hardhat 3 configuration is now fully declarative. This contrasts with Hardhat 2, where some things are configured by the side effects of certain imports and function calls.

## Programmatic initialization of the Hardhat Runtime Environment

Apart from accessing a global instance of the HRE by importing it from the `hardhat` module, you can now initialize multiple independent instances of the Hardhat Runtime Environment programmatically.

## Configuration Variables

Hardhat 3 has support for Configuration Variables: values of the config that will only be loaded when needed. A similar feature already exists in Hardhat 2, but Hardhat 3's configuration variables are lazy and extensible.

By default, their values are loaded from environment variables, but this behavior can be customized by plugins. Hardhat 3 comes with an official plugin that lets you store them encrypted on disk.

## Build profiles

Hardhat 3 introduces support for build profiles, which let you use different compilation settings for different tasks.

## Full npm support

The build system of Hardhat 3 is now fully integrated with npm: anything that can be done with npm is supported. In most cases, this won't affect you, but advanced scenarios that were previously difficult or unsupported now work out of the box.

## New plugin system

Hardhat 3 comes with a new hook system that enables easy extension of core functionality and allows plugin authors to add their own extensibility points.

## Typed artifacts

Hardhat 3 generates TypeScript declarations to have typed artifacts by default. These artifacts can be used by plugins to derive contract type information without a code generation step.
