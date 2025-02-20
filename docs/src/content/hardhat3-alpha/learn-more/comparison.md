---
prev: false
---

# Differences with Harhdat 2

Hardhat 3 brings major improvements and new features, with a focus on testing capabilities and multichain development. This document outlines the key differences and innovations introduced in Hardhat 3. While this list is long, most of these changes are either backwards-compatible, or easy to adapt in existing projects.

## Support for Solidity Tests

Hardhat 3 introduces support for writing tests directly in Solidity, a feature designed to streamline Solidity-based testing. This makes it easier to test contracts without switching contexts or relying exclusively on JavaScript/TypeScript. These tests are compatible with those written for Foundry. Learn more in the deep dive into Solidity tests.

## Multichain Development Workflows

Hardhat 2 assumed a mainnet-like environment for simulations, which is the approach used by most existing tools. Hardhat 3 instead offers native support for multiple chain types, enabling developers to tailor their workflows to specific blockchain environments. Chain types represent the characteristics of different blockchains, such as mainnet, testnet, or custom configurations. Read more in the deep dive into multichain support.

## Declarative Configuration

In Hardhat 2, configuration was defined using a DSL that could involve side effects. Hardhat 3 simplifies this by introducing a declarative configuration style. Configuration is now a plain JavaScript object, making it more predictable and easier to understand. This also allows developers to create Hardhat environments dynamically at runtime.

## ESM-First

Hardhat 3 embraces modern JavaScript by making ECMAScript Modules (ESM) the default. Projects must now use ESM, although CommonJS (CJS) modules are still usable within ESM projects for compatibility. For more details, check out the deep dive into ESM.

## Test Runner Plugins

In Hardhat 2, Mocha was bundled with the framework. In Hardhat 3, Mocha has been moved to a plugin, alongside a new plugin for the Node.js test runner. This provides developers with the flexibility to choose their preferred test runner. Mocha remains fully supported for those who wish to continue using it. Learn more in the Node test runner deep dive.

## Network Manager

The relationship between executions and connections has been revamped in Hardhat 3. In Hardhat 2, each execution was tied to a single connection. In Hardhat 3, connections are explicitly created and managed, allowing for multiple connections and dynamic workflows. Find more information in the Network Manager deep dive.

## Build Profiles

Build profiles are now a first-class concept in Hardhat 3, simplifying development and production configurations. In Hardhat 2, this was achieved through a mix of code in configuration files and environment variables. In Hardhat 3, profiles integrate seamlessly with built-in tasks. For instance, a development profile is used when running tests and a production profile when deploying and verifying.

## Improved Compilation Pipeline

The compilation process in Hardhat 3 has been significantly enhanced, with better support for managing dependencies through npm and improved handling of remappings. Learn more in the deep dive into dependency management. While remappings are fully supported, they shouldn't be needed; you only use with them if you want to.

## Lazy and Extensible Configuration Variables

Hardhat 3 builds on Hardhat 2's configuration variable system, making it more powerful and flexible. Variables are now defined lazily, meaning they are only required if a specific workflow needs them. Learn more in the deep dive into configuration variables. Their fetching is handled by plugins, with Hardhat shipping a default plugin that stores them encrypted on disk. Plugins can also be created to fetch and store variables using other systems, such as AWS Secrets Manager or HashiCorp Vault.

## Hooks

Hardhat 3 introduces a powerful hooks system, enabling greater extensibility for plugin authors. Learn more in the deep dive into hooks. This feature is primarily for plugin developers and is not something most users will need to interact with directly.
