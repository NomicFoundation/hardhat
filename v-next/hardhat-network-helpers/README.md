# Hardhat Network Helpers

Hardhat Network Helpers is a library that provides a set of utility functions to interact with the [Hardhat Network](https://hardhat.org/hardhat-network/docs).

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-network-helpers@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import networkHelpersPlugin from "@nomicfoundation/hardhat-network-helpers";

// ...

export default {
  // ...
  plugins: [
    // ...
    networkHelpersPlugin,
  ],

  // ...
};
```

### Usage

This plugin defines a new `networkHelpers` property to every `NetworkConnection` object.

```ts
const { networkHelpers } = await hre.network.connect();

// Network helpers methods exposed via `networkHelpers`
await networkHelpers.mine();

// Time methods exposed via `time`
await networkHelpers.time.increase(1);

// Duration methods exposed via `duration`
networkHelpers.time.duration.days(1);
```
