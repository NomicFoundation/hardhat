# Hardhat Slang Solx plugin

This plugin enables the [solx](https://github.com/NomicFoundation/solx) Solidity compiler in Hardhat 3.

The `solx` compiler is currently experimental and is not ready for production use-cases. We recommend using the compiler for test builds and test execution locally, and continuing to use `solc` for production use-cases (including during deployment for example with `hardhat-ignition` and in your CI). Care should be taken before enabling compilation with `solx` in other build profiles, see configuration flags further below.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-slang-solx
```

Then add the plugin to your `hardhat.config.ts` and create a `slang-solx` build profile. You must use the build profiles config format, which requires both a `default` and a `slang-solx` profile:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatSlangSolx from "@nomicfoundation/hardhat-slang-solx";

export default defineConfig({
  plugins: [hardhatSlangSolx],
  solidity: {
    profiles: {
      default: {
        version: "0.8.29",
      },
      "slang-solx": {
        type: "slangSolx",
        version: "0.8.34",
      },
    },
  },
});
```

The `default` profile uses solc as usual. The `slang-solx` profile uses the solx compiler, identified by `type: "slangSolx"`. Your `.sol` files should have compatible pragmas, for example `pragma solidity ^0.8.29;`. Strict pragmas for unsupported Solidity versions, for example `pragma solidity 0.8.28;`, will currently not compile with this hardhat-slang-solx plugin. See more details below for the currently supported Solidity versions and EVM versions.

## Usage

Run tests or compile using the solx-powered build profile:

```bash
hardhat test --build-profile slang-solx
hardhat build --build-profile slang-solx
```

The default profile continues to use solc as usual:

```bash
hardhat build    # uses solc (default profile)
```

## Configuration

### Multi-version example

You can configure the `slang-solx` profile with multiple compilers. Compilers without `type: "slangSolx"` will use solc:

```typescript
export default defineConfig({
  plugins: [hardhatSlangSolx],
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: "0.8.34" }, { version: "0.8.20" }],
      },
      "slang-solx": {
        compilers: [
          { type: "slangSolx", version: "0.8.34" },
          { version: "0.8.20" }, // uses solc, solx doesn't support this version
        ],
      },
    },
  },
});
```

### Options

- `dangerouslyAllowSlangSolxInProduction` (`boolean`, default: `false`), allows compiler type `"slangSolx"` in build profiles other than `slang-solx`. By default, using `type: "slangSolx"` in any other profile (e.g. `default`, `production`) will produce a validation error.

```typescript
export default defineConfig({
  plugins: [hardhatSlangSolx],
  solidity: {
    profiles: {
      default: {
        type: "slangSolx", // returns a validation error.
        version: "0.8.34",
      },
    },
  },
  slangSolx: {
    dangerouslyAllowSlangSolxInProduction: false, // default false, switching this to true will allow `type: "slangSolx"` on the default profile.
  },
});
```

### Optimization level

solx optimizes via LLVM; set the level per profile with `settings.optimizer.mode` — one of `"1"`, `"2"`, `"3"` (best performance), `"s"` (optimize for size), or `"z"` (aggressively minimize size). The plugin defaults to `"1"` (solx's own default if left unset is `"3"`).

solx has two independent optimizer knobs:

- `optimizer.mode` (above) is the LLVM backend level. There is **no "off"** — the minimum is `"1"`, so LLVM always optimizes.
- `optimizer.enabled` is the embedded solc front end's own optimizer, `false` by default. It only affects the legacy pipeline, where it optimizes the EVM assembly solx translates. Under `viaIR: true` it changes nothing but the metadata hash: solx bypasses the Yul optimizer entirely, so the IR handed to LLVM is always unoptimized.

For example, optimizing for size instead of performance:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatSlangSolx from "@nomicfoundation/hardhat-slang-solx";

export default defineConfig({
  plugins: [hardhatSlangSolx],
  solidity: {
    profiles: {
      default: { version: "0.8.34" },
      "slang-solx": {
        type: "slangSolx",
        version: "0.8.34",
        settings: { optimizer: { mode: "z" } }, // optimize for size
      },
    },
  },
});
```

Or, on the legacy pipeline, run the front end's assembly optimizer before LLVM `-O3` (both knobs on) — just the `slang-solx` profile:

```typescript
"slang-solx": {
  type: "slangSolx",
  version: "0.8.34",
  settings: { optimizer: { enabled: true, mode: "3" } },
},
```

### Supported Solidity versions

solx maps each Solidity version to a specific solx binary version internally. Currently supported: `0.8.34` (solx 0.1.8). Earlier solx releases did not emit the DWARF debug info that EDR relies on for Solidity stack traces, so they are not supported by this plugin.

### EVM version support

solx supports EVM versions `cancun`, `prague`, and `osaka`. Using an older EVM target (e.g., `paris`, `shanghai`) with compiler type `"slangSolx"` will result in a validation error.
