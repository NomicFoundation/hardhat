# Hardhat Solx plugin

This plugin enables the [solx](https://github.com/NomicFoundation/solx) Solidity compiler in Hardhat 3.

The `solx` compiler is currently experimental and is not ready for production use-cases. We recommend using the compiler for test builds and test execution locally, and continuing to use `solc` for production use-cases (including during deployment for example with `hardhat-ignition` and in your CI). Care should be taken before enabling compilation with `solx` in other build profiles, see configuration flags further below.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-solx
```

Then add the plugin to your `hardhat.config.ts` and create a `solx` build profile. You must use the build profiles config format, which requires both a `default` and a `solx` profile:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatSolx from "@nomicfoundation/hardhat-solx";

export default defineConfig({
  plugins: [hardhatSolx],
  solidity: {
    profiles: {
      default: {
        version: "0.8.29",
      },
      solx: {
        type: "solx",
        version: "0.8.34",
      },
    },
  },
});
```

The `default` profile uses solc as usual. The `solx` profile uses the solx compiler, identified by `type: "solx"`. Your `.sol` files should have compatible pragmas, for example `pragma solidity ^0.8.29;`. Strict pragmas for unsupported Solidity versions, for example `pragma solidity 0.8.28;`, will currently not compile with this hardhat-solx plugin. See more details below for the currently supported Solidity versions and EVM versions.

## Usage

Run tests or compile using the solx-powered build profile:

```bash
hardhat test --build-profile solx
hardhat build --build-profile solx
```

The default profile continues to use solc as usual:

```bash
hardhat build    # uses solc (default profile)
```

## Configuration

### Multi-version example

You can configure the `solx` profile with multiple compilers. Compilers without `type: "solx"` will use solc:

```typescript
export default defineConfig({
  plugins: [hardhatSolx],
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: "0.8.34" }, { version: "0.8.20" }],
      },
      solx: {
        compilers: [
          { type: "solx", version: "0.8.34" },
          { version: "0.8.20" }, // uses solc, solx doesn't support this version
        ],
      },
    },
  },
});
```

### Options

- `dangerouslyAllowSolxInProduction` (`boolean`, default: `false`), allows compiler type `"solx"` in build profiles other than `solx`. By default, using `type: "solx"` in any other profile (e.g. `default`, `production`) will produce a validation error.

```typescript
export default defineConfig({
  plugins: [hardhatSolx],
  solidity: {
    profiles: {
      default: {
        type: "solx", // returns a validation error.
        version: "0.8.34",
      },
    },
  },
  solx: {
    dangerouslyAllowSolxInProduction: false, // default false, switching this to true will allow `type: "solx"` on the default profile.
  },
});
```

### Optimization level

solx optimizes via LLVM; set the level per profile with `settings.optimizer.mode` — one of `"1"`, `"2"`, `"3"` (best performance), `"s"` (optimize for size), or `"z"` (aggressively minimize size). The plugin defaults to `"1"` (solx's own default if left unset is `"3"`).

solx has two independent optimizer knobs, and both affect the output:

- `optimizer.mode` (above) is the LLVM backend level. There is **no "off"** — the minimum is `"1"`, so LLVM always optimizes.
- `optimizer.enabled` is the Yul optimizer (standard solc semantics), `false` by default. Enabling it optimizes _on top of_ LLVM; it does not turn LLVM off.

For example, optimizing for size instead of performance:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatSolx from "@nomicfoundation/hardhat-solx";

export default defineConfig({
  plugins: [hardhatSolx],
  solidity: {
    profiles: {
      default: { version: "0.8.34" },
      solx: {
        type: "solx",
        version: "0.8.34",
        settings: { optimizer: { mode: "z" } }, // optimize for size
      },
    },
  },
});
```

Or run the Yul optimizer as well, on top of LLVM `-O3` (both knobs on) — just the `solx` profile:

```typescript
solx: {
  type: "solx",
  version: "0.8.34",
  settings: { optimizer: { enabled: true, mode: "3" } },
},
```

### Supported Solidity versions

solx maps each Solidity version to a specific solx binary version internally. Currently supported: `0.8.34` (solx 0.1.4). Earlier solx releases did not emit the DWARF debug info that EDR relies on for Solidity stack traces, so they are not supported by this plugin.

### EVM version support

solx supports EVM versions `cancun`, `prague`, and `osaka`. Using an older EVM target (e.g., `paris`, `shanghai`) with compiler type `"solx"` will result in a validation error.
