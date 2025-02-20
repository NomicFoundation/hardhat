---
prev: false
---

# Differences with Harhdat 2

This document outlines the key improvements and new features introduced in Hardhat 3. While this list is long, most of these changes are backwards-compatible or easy to adapt to existing projects.

## Support for Solidity Tests

Hardhat 3 comes with Foundry-compatible Solidity tests, which are fast and ideal for unit testing. Writing integration tests in TypeScript is still supported and can be used alongside Solidity tests.

## Multichain support

In Hardhat 2, you can only configure a single Hardhat network, which always behaves like Ethereum Mainnet. Hardhat 3 introduces chain types, letting you choose which kind of chain you want to simulate. And you can configure multiple Hardhat networks, each with its own chain type.

The first version will have support for Ethereum Mainnet and OP Mainnet, plus a "generic" chain type that can be used as a fallback for chains that are not yet supported.

## Network manager

A Hardhat 2 task has access to a single, fixed connection for its entire duration. In Hardhat 3, connections are managed explicitly, and tasks can create and use multiple connections simultaneously.

## ESM-first

Hardhat 3 embraces modern JavaScript by using ECMAScript Modules (ESM) by default. Configuration files must now use ESM, although CommonJS (CJS) modules are still supported in scripts and tests.

## Test Runner Plugins

In Hardhat 2, JavaScript tests are always run with a bundled version of Mocha. In Hardhat 3, the test runner is just another plugin and you can choose which one to use.

Hardhat 3 provides official plugins for running tests: one for Mocha and one for Node.js’s built-in test runner. The recommended option is the Node.js test runner, because it's fast and has no external dependencies.

## Declarative Configuration

Hardhat 3 configuration is now fully declarative. This contrasts with Hardhat 2, where some things are configured by the side effects of certain imports and function calls.

## Programmatic initialization of the Hardhat Runtime Environment

Apart from accessing a global instance of the HRE by importing it from "hardhat", you can now initialize multiple independent instances of the Hardhat Runtime Environment programmatically.

## Configuration Variables

Hardhat 3 has support for Configuration Variables, which are values of the config that will only be loaded when needed. A similar feature already exists in Hardhat 2, but Hardhat 3's configuration variables are lazy and extensible.

By default, their values are loaded from environment variables, but this behavior can be customized by plugins. Hardhat 3 comes with an official plugin that lets you store them encrypted on disk.

## Build profiles

Hardhat 3 introduces support for build profiles, which let you use different compilation settings for different tasks.

## Full npm support

The build system of Hardhat 3 is now fully integrated with npm: anything that can be done with npm is supported. In most cases, this won't affect you, but advanced scenarios that were previously difficult or unsupported now work out of the box.

## New plugin system

Hardhat 3 comes with a new hook system that enables easy extension of core functionality and allows plugin authors to add their own extensibility points.

## Typed artifacts

Hardhat 3 generates TypeScript declarations to have typed artifacts by default. These artifacts can be used by plugins to derive contract type information without a code generation step.
