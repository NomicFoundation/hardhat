# Hardhat Node.js Test Runner plugin

This plugin integrates the native Node.js Test Runner (or [`node:test`](https://nodejs.org/docs/latest/api/test.html)) into Hardhat.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-node-test-runner@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import nodeTestPlugin from "@nomicfoundation/hardhat-node-test-runner";

// ...

export default {
  // ...
  plugins: [
    // ...
    nodeTestPlugin,
  ],

  // ...
};
```

## Usage

This plugin defines a new task called `test node` that runs your tests using `node:test`. This task gets executed automatically when running `npx hardhat test`.
