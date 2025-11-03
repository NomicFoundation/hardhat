# hardhat-toolbox-viem

This toolbox includes a set of plugins to build Hardhat projects with [viem](https://viem.sh/) as the connection library and the [Node.js test runner](https://nodejs.org/api/test.html) for TypeScript tests. It's our recommended toolbox for new Hardhat projects.

## Sample project

You can initialize a project based on this toolbox by running `npx hardhat --init` and selecting `A TypeScript Hardhat project using Node Test Runner and Viem` as the project type.

## Manual installation

If you want to add the toolbox manually, first install the package:

```bash
npm install --save-dev @nomicfoundation/hardhat-toolbox-viem
```

Then add it to your Hardhat configuration:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

export default defineConfig({
  plugins: [hardhatToolboxViem],
});
```

## Included functionality

With this toolbox, you can:

- Use [viem](https://viem.sh/) as the connection library for interacting with the network
- Write Solidity tests using Hardhat's built-in test runner
- Write TypeScript tests using the [Node.js test runner](https://nodejs.org/api/test.html) and our [viem assertions plugin](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-viem-assertions).
- Verify contracts with [hardhat-verify](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-verify)
- Deploy contracts using [Hardhat Ignition](https://hardhat.org/ignition)

## Bundled plugins

When you install `@nomicfoundation/hardhat-toolbox-viem`, these plugins are automatically installed as peer dependencies:

- [`@nomicfoundation/hardhat-ignition`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-ignition)
- [`@nomicfoundation/hardhat-ignition-viem`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-ignition-viem)
- [`@nomicfoundation/hardhat-keystore`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-keystore)
- [`@nomicfoundation/hardhat-network-helpers`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-network-helpers)
- [`@nomicfoundation/hardhat-node-test-runner`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-node-test-runner)
- [`@nomicfoundation/hardhat-viem`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-viem)
- [`@nomicfoundation/hardhat-viem-assertions`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-viem-assertions)
- [`@nomicfoundation/hardhat-verify`](https://github.com/NomicFoundation/hardhat/tree/v-next/v-next/hardhat-verify)

## Explicitly installing plugins

In some cases, you may need to manually install one of the included plugins. This can happen if:

- You want to use a different version than the one included in the toolbox.
- You need to import something from the plugin in your code and need to have it in your `package.json` to avoid issues.

For example, the `@nomicfoundation/hardhat-viem-assertions` plugin includes an `anyValue` predicate that can be used along with the `.emitWithArgs` assertion. If you want to use this predicate in your code, you need to install the plugin explicitly:

```bash
npm install --save-dev @nomicfoundation/hardhat-viem-assertions
```

Then you'll be able to import things from the plugin:

```typescript
import { anyValue } from "@nomicfoundation/hardhat-viem-assertions/predicates";
```
