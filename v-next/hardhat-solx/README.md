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
    version: "0.8.28",
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

The plugin works out of the box with sensible defaults. You can optionally customize the plugin config:

```typescript
export default defineConfig({
  plugins: [hardhatSolx],
  solidity: "0.8.28",
  // Plugin config (controls solx binary version and compile-time settings)
  solx: {
    version: "0.1.3",
    settings: {
      viaIR: true,
      LLVMOptimization: "1",
    },
  },
});
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `version` | `string` | `"0.1.3"` | solx binary version to download |
| `settings` | `Record<string, unknown>` | `{ viaIR: true, LLVMOptimization: "1" }` | Settings injected into the standard-json input at compile time |
| `dangerouslyAllowSolxInProduction` | `boolean` | `false` | Allow compiler type `"solx"` in the production build profile |

### EVM version support

solx supports EVM versions `cancun`, `prague`, and `osaka`. Using an older EVM target (e.g., `paris`, `shanghai`) with compiler type `"solx"` will produce a validation error.
