---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/ethereum-optimism/plugins/tree/master/src/hardhat/compiler)
:::

# @eth-optimism/plugins/hardhat/compiler

A plugin that brings OVM compiler support to Hardhat projects.

## Installation

Installation is super simple. 

First, grab the package.
Via `npm`: 

```
npm install @eth-optimism/plugins
```

Via `yarn`:

```
yarn add @eth-optimism/plugins
```

Next, import the plugin inside your `hardhat.config.js`:

```js
// hardhat.config.js

require("@eth-optimism/plugins/hardhat/compiler")
```

Or if using TypeScript:

```ts
// hardhat.config.ts

import "@eth-optimism/plugins/hardhat/compiler"
```

## Configuration

**By default, this plugin will use OVM compiler version 0.7.6**.
Configure this plugin by adding an `ovm` field to your Hardhat config:

```js
// hardhat.config.js

require("@eth-optimism/plugins/hardhat/compiler")

module.exports = {
    ovm: {
        solcVersion: 'X.Y.Z' // Your version goes here.
    }
}

```

Has typings so it won't break your Hardhat config if you're using TypeScript.
