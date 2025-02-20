# Hardhat Mocha plugin

This plugin integrates the [Mocha](https://mochajs.org/) into Hardhat.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-mocha@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import mochaPlugin from "@nomicfoundation/hardhat-mocha";

// ...

export default {
  // ...
  plugins: [
    // ...
    mochaPlugin,
  ],

  // ...
};
```

## Usage

This plugin defines a new task called `test mocha` that runs yout tests using Mocha. This task gets executed automatically executed when running `npx hardhat test`.
