---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/facuspagnuolo/hardhat-local-networks-config-plugin/tree/master)
:::

[![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)
[![CI Status](https://github.com/facuspagnuolo/hardhat-local-networks-config-plugin/workflows/CI/badge.svg)](https://github.com/facuspagnuolo/hardhat-local-networks-config-plugin/actions)

# hardhat-local-networks-config-plugin

Allow loading network configs for Hardhat projects in home file 

## What

This plugin allows you to specify a local configuration file to populate the Hardhat's networks config.
This means users can keep critical information stored locally without risking it to the project's devs or users.
For example, you can keep your providers keys or private keys in a secured directory without exposing them.

## Installation

Install dependency from NPM:

```bash
npm install hardhat-local-networks-config-plugin hardhat
```

And add the following statement to your `hardhat.config.js`:

```js
require('hardhat-local-networks-config-plugin')
```

Or, if you are using TypeScript, add this to your hardhat.config.ts:

```ts
import 'hardhat-local-networks-config-plugin';
```

## Required plugins

This plugin does not require any extra plugin.

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin does not perform any environment extension.

## Configuration

This plugin extends the `HardhatUserConfig` object with an optional `localNetworksConfig` field.

This is an example of how to set it:

```js
module.exports = {
  localNetworksConfig: '~/.hardhat/networks.ts'
}
```

In case a `localNetworksConfig` is not provided, the plugin will try to read it from `~/.hardhat/networks.json`.

Note that both JS/TS and JSON formats are supported.

## Usage

The local configuration file should support the following interface, any other field will be simply ignored:

```ts
export interface LocalNetworksConfig {
  networks?: NetworksConfig
  defaultConfig?: NetworkConfig
}
```

Where `NetworksConfig` and `NetworkConfig` are based types defined by Hardhat.

In case there is a conflict between any of the local network configs, the default one, or the ones defined in your
project, the following list of priorities will be enforced:

1. Project network specific configuration
2. Local network specific configuration
3. Local default network configuration

A local configuration file could look as follows:

```json
{
  "networks": {
    "rinkeby": {
      "gasMultiplier": 2,
      "accounts": ["0x12..56","0xab..cd"],
      "url": "https://rinkeby.infura.io/v3/<API_KEY>"
    },
    "mainnet": {
      "accounts": ["0x12..56","0xab..cd"],
      "url": "https://mainnet.infura.io/v3/<API_KEY>"
    }
  },
  "defaultConfig": {
    "gasPrice": "auto"
  }
}
```

## TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: 
`"node_modules/hardhat-local-networks-config-plugin/src/type-extensions.d.ts"`
