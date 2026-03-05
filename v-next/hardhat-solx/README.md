# Hardhat Solx plugin

This plugin enables the [solx](https://solx.zksync.io/) LLVM-based Solidity compiler for test builds in Hardhat 3.

When installed, the plugin automatically creates a `test` build profile that uses solx instead of solc, with optimized default settings (`viaIR: true`, `LLVMOptimization: "1"`).

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-solx
```

Then add the plugin to your `hardhat.config.ts`:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatSolx from "@nomicfoundation/hardhat-solx";

export default defineConfig({
  plugins: [hardhatSolx],
  solidity: {
    version: "0.8.33",
  },
});
```

## Usage

Run tests using the solx-powered test profile:

```bash
hardhat test --buildProfile test
```

The default profile continues to use solc as usual:

```bash
hardhat build    # uses solc (default profile)
```

## Configuration

The plugin works out of the box with sensible defaults. The only optional configuration is:

```typescript
export default defineConfig({
  plugins: [hardhatSolx],
  solidity: "0.8.33",
  solx: {
    dangerouslyAllowSolxInProduction: false, // default
  },
});
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `dangerouslyAllowSolxInProduction` | `boolean` | `false` | Allow compiler type `"solx"` in the production build profile |

### Supported Solidity versions

solx maps each Solidity version to a specific solx binary version internally. Currently supported Solidity versions: `0.8.30`, `0.8.33`.

### EVM version support

solx supports EVM versions `cancun`, `prague`, and `osaka`. Using an older EVM target (e.g., `paris`, `shanghai`) with compiler type `"solx"` will produce a validation error.
