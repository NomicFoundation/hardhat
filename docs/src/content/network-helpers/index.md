# Network Helpers

:::warning

This package is in beta. While we don't expect major changes to its API, some details could change.

:::

[@nomicfoundation/hardhat-network-helpers](https://www.npmjs.com/package/@nomicfoundation/hardhat-network-helpers) provides convenience functions for working with [Hardhat Network](/hardhat-network).

Hardhat Network exposes its custom functionality primarily through its JSON-RPC API. See the extensive set of methods available in [its reference documentation](../hardhat-network/reference#hardhat-network-methods). However, for easy-to-read tests and short scripts, interfacing with the JSON-RPC API is too noisy, requiring a verbose syntax and extensive conversions of both input and output data.

This package provides convenience functions for quick and easy interaction with Hardhat Network. Facilities include the ability to mine blocks up to a certain timestamp or block number, the ability to manipulate attributes of accounts (balance, code, nonce, storage), the ability to impersonate specific accounts, and the ability to take and restore snapshots.

## Installation

::::tabsgroup{options=npm,yarn}

:::tab{value=npm}

```bash
npm install @nomicfoundation/hardhat-network-helpers@beta
```

:::

:::tab{value=yarn}

```bash
yarn add @nomicfoundation/hardhat-network-helpers@beta
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

Since this is not a Hardhat plugin, you don't need to import it in your config.

For a full listing of all of the helpers provided by this package, see [the reference documentation](/network-helpers/reference).
