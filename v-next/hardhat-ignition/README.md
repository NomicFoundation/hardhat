# Hardhat Ignition plugin

This plugin integrates [Hardhat Ignition][https://hardhat.org/ignition] into Hardhat.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import hardhatIgnitionPlugin from "@nomicfoundation/hardhat-ignition";

// ...

export default {
  // ...
  plugins: [
    // ...
    hardhatIgnitionPlugin,
  ],

  // ...
};
```

## Usage

To learn more about how to use Hardhat Ignition, check out the [Hardhat Ignition documentation](https://hardhat.org/ignition/docs/getting-started).
