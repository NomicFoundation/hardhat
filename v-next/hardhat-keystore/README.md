# Hardhat Keystore plugin

This plugin adds an encrypted keystore to Hardhat, to handle secret values (e.g. API keys and private keys) in your config securely.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-keystore@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import hardhatKeystorePlugin from "@nomicfoundation/hardhat-keystore";

// ...

export default {
  // ...
  plugins: [
    // ...
    hardhatKeystorePlugin,
  ],

  // ...
};
```

## Usage

### Using Configuration Variables in your config

To use values handled by the keystore in your config, you should use the `configVariable` function. For example, this config uses the `SENDER` variable in the `example` network config:

```typescript
import { configVariable } from "hardhat/config";

export default {
  // ...
  networks: {
    example: {
      type: "http",
      url: "<json-rpc-url>",
      accounts: [configVariable("SENDER")],
    },
  },
};
```

The `SENDER` value will be fetched from the keystore only when needed.

### Managing secrets

You can add, remove and list secrets using the `keystore` task and its subtasks.

To learn more about them, run `npx hardhat keystore --help`.

```bash
npx hardhat keystore --help
Store your keys in a secure way

Usage: hardhat [GLOBAL OPTIONS] keystore <SUBTASK> [SUBTASK OPTIONS] [--] [SUBTASK POSITIONAL ARGUMENTS]

AVAILABLE SUBTASKS:

  keystore delete      Delete a key from the keystore
  keystore get         Get a value given a key
  keystore list        List all keys in the keystore
  keystore set         Sets a new value in the keystore associated with the specified key

To get help for a specific task run: npx hardhat keystore <SUBTASK> --help
```
