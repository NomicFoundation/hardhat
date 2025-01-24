---
title: Hardhat Network Helpers
description: Hardhat Network Helpers is a library that provides a set of utility functions to interact with the Hardhat Network.
---

# Overview

[@nomicfoundation/hardhat-network-helpers](https://www.npmjs.com/package/@nomicfoundation/hardhat-network-helpers) provides a convenient JavaScript interface to the JSON-RPC functionality of [Hardhat Network](/hardhat-network).

Hardhat Network exposes its custom functionality primarily through its JSON-RPC API. See the extensive set of methods available in [its reference documentation](/hardhat-network/docs/reference#hardhat-network-methods). However, for easy-to-read tests and short scripts, interfacing with the JSON-RPC API is too noisy, requiring a verbose syntax and extensive conversions of both input and output data.

This package provides convenience functions for quick and easy interaction with Hardhat Network. Facilities include the ability to mine blocks up to a certain timestamp or block number, the ability to manipulate attributes of accounts (balance, code, nonce, storage), the ability to impersonate specific accounts, and the ability to take and restore snapshots.

## Installation

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm install --save-dev @nomicfoundation/hardhat-network-helpers
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev @nomicfoundation/hardhat-network-helpers
```

:::

:::tab{value=yarn}

```
yarn add --dev @nomicfoundation/hardhat-network-helpers
```

:::

:::tab{value="pnpm"}

```
pnpm add -D @nomicfoundation/hardhat-network-helpers
```

:::

::::

## Usage

To use a network helper, simply import it where you want to use it:

::::tabsgroup{options=TypeScript,JavaScript}

:::tab{value=TypeScript}

```ts
import { mine } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
  // instantly mine 1000 blocks
  await mine(1000);
}
```

:::

:::tab{value=JavaScript}

```js
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
  // instantly mine 1000 blocks
  await mine(1000);
}
```

:::

::::

Since this is not a Hardhat plugin, you don’t need to import the whole package in your config. You can simply import each specific helper function where you need to use them.

For a full listing of all the helpers provided by this package, see [the reference documentation](./reference).
