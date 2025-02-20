# Hardhat Typechain plugin

This plugin integrates [TypeChain](https://github.com/dethcrypto/TypeChain) into Hardhat, automatically generating TypeScript bindings for your smart contracts.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-typechain@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import typechainPlugin from "@nomicfoundation/hardhat-typechain";

// ...

export default {
  // ...
  plugins: [
    // ...
    typechainPlugin,
  ],

  // ...
};
```

## Configuration

You can configure it in the `hardhat.config.ts` file under the `typechain` property.

## Usage

No extra steps are required to use this plugin. It will be run automatically by Hardhat when building your contracts.
