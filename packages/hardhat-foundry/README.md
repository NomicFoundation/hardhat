[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-foundry.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-foundry) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-foundry

This plugin makes it easier to use Hardhat and [Foundry](https://getfoundry.sh/) in the same project.

When this plugin is enabled, Hardhat will use the same contracts directory that is used by Foundry, and it will be able to use dependencies installed with `forge install`.

If you have a pure Hardhat project, you can use the `init-foundry` task to create a `foundry.toml` file. The file will be created using the proper values to make Foundry work well with your Hardhat project.

Read [our guide](https://v2.hardhat.org/hardhat-runner/docs/advanced/hardhat-and-foundry) to learn more.

## How it works

The plugin uses `forge config` to get Foundry's configuration and remappings. It then uses this information to make Hardhat's configuration compatible with Foundry.

Two of Hardhat's paths are updated: the `sources` path to make it match the one used by Foundry, and the `cache` path to guarantee that a different one is used, preventing potential issues.

The compilation task is also modified to add support for Foundry's remappings. This means that you can compile your contracts both with `npx hardhat compile` and `forge build`, and in both cases you can use dependencies installed with npm or with Foundry.
