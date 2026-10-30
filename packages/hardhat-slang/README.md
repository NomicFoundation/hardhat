# Hardhat Slang plugin

> ⚠️ Warning: `slang` is an experimental compiler. Key functionality, such as validation of incorrect code, is still under active development. Keep using solc for production builds and anything you deploy.

This plugin enables the new `slang` Solidity compiler in Hardhat.

The `slang` compiler is experimental and is not ready for production use-cases. Use it to explore test builds and test execution locally, and keep using `solc` for production use-cases (including during deployment, for example with `hardhat-ignition` and in your CI). Care should be taken before enabling compilation with `slang` in other build profiles, see the configuration flags below.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-slang
```

Then add the plugin to your `hardhat.config.ts` and create a `slang` build profile. You must use the build profiles config format, which requires both a `default` and a `slang` profile:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatSlang from "@nomicfoundation/hardhat-slang";

export default defineConfig({
  plugins: [hardhatSlang],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      slang: {
        type: "slang",
        version: "0.8.34",
      },
    },
  },
});
```

The `default` profile uses solc as usual. The `slang` profile uses the slang compiler, identified by `type: "slang"`. The `version` of a `type: "slang"` entry is still the Solidity version, exactly as with solc: Hardhat uses it to resolve pragmas and group files into compilation jobs. The `slang` release will be the latest available within the plugin, unless you pin a specific version with `slang.version` (see [Pinning a slang release](#pinning-a-slang-release)).

## Usage

Run tests or compile using the slang build profile:

```bash
npx hardhat test --build-profile slang
npx hardhat build --build-profile slang
```

The default profile continues to use solc as usual:

```bash
npx hardhat build    # uses solc (default profile)
```

## Configuration

### Pinning a slang release

Unlike solc, one `slang` binary compiles a range of Solidity versions (`0.8.x`). The plugin therefore downloads a single slang release and uses it for every `type: "slang"` compiler entry.

By default, that is the latest release available within this version of the plugin: the first row of [Supported Solidity versions](#supported-solidity-versions). Upgrading the plugin can therefore upgrade slang, and your next build recompiles with the new release.

To stay on a specific release of `slang`, pin it with `slang.version`. A pinned release keeps being used even after upgrading the plugin:

```typescript
export default defineConfig({
  // ...
  slang: {
    version: "0.1.0-pre.2026-10-14",
  },
});
```

### Multi-version example

You can configure the `slang` profile with multiple compilers. Compilers without `type: "slang"` will use solc:

```typescript
export default defineConfig({
  plugins: [hardhatSlang],
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: "0.8.34" }, { version: "0.8.20" }],
      },
      slang: {
        compilers: [
          { type: "slang", version: "0.8.34" }, // compiled by the slang release
          { type: "slang", version: "0.8.20" }, // same binary, different Solidity version
          { version: "0.7.6" }, // uses solc; outside the slang range
        ],
      },
    },
  },
});
```

### Options

- `version` (`string`, default: the latest release available in this version of the plugin), pins the slang release to download and compile with. See [Supported Solidity versions](#supported-solidity-versions) for the known releases.
- `dangerouslyAllowSlangInProduction` (`boolean`, default: `false`), allows compiler type `"slang"` in build profiles other than `slang`. By default, using `type: "slang"` in any other profile (e.g. `default`, `production`) will produce a validation error.

```typescript
export default defineConfig({
  plugins: [hardhatSlang],
  solidity: {
    profiles: {
      default: {
        type: "slang", // not recommended, allowed only because of the option below
        version: "0.8.34",
      },
      slang: {
        type: "slang",
        version: "0.8.34",
      },
    },
  },
  slang: {
    dangerouslyAllowSlangInProduction: true,
  },
});
```

### Using a custom binary

Point a compiler entry at a locally built binary with `path`. The entry skips the download and the Solidity range check, and the plugin reads the compiler version from the binary's `--version` output:

```typescript
slang: {
  type: "slang",
  version: "0.8.34",
  path: "/path/to/slang",
},
```

### Optimization level

slang optimizes via LLVM; set the level per profile with `settings.optimizer.mode`:

| Mode  | What it does                                          |
| ----- | ----------------------------------------------------- |
| `"1"` | Least optimization, fastest to compile (the default). |
| `"2"` | More runtime optimization.                            |
| `"3"` | Best runtime performance.                             |
| `"s"` | Smaller bytecode.                                     |
| `"z"` | Smallest bytecode.                                    |

There is **no "off"**: the minimum is `"1"`, so LLVM always optimizes. The solc-specific knobs `optimizer.enabled` and `viaIR` have no effect on the slang pipeline, which has neither the solc optimizer nor a Yul step; the plugin passes them through untouched.

For example, optimizing for size instead of performance:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatSlang from "@nomicfoundation/hardhat-slang";

export default defineConfig({
  plugins: [hardhatSlang],
  solidity: {
    profiles: {
      default: { version: "0.8.34" },
      slang: {
        type: "slang",
        version: "0.8.34",
        settings: { optimizer: { mode: "z" } }, // optimize for size
      },
    },
  },
});
```

### Supported Solidity versions

Each slang release supports a range of Solidity versions. A compiler entry's `version` picks the Solidity version within that range, and the plugin passes it to slang as `settings.solidityVersion`.

| slang release | Solidity versions | Notes |
| --- | --- | --- |
| `0.1.0-pre.2026-10-29` | `0.8.0` to `0.8.37` | Internal prerelease (solx tag `d95c1150`, 2026-10-29) downloaded from the releases mirror. |
| `0.1.0-pre.2026-10-14` | `0.8.0` to `0.8.37` | Internal prerelease (solx tag `5e6ec5e1`, 2026-10-14) downloaded from the releases mirror. |

### EVM version support

slang supports EVM versions `cancun`, `prague`, and `osaka`. Using an older EVM target (e.g., `paris`, `shanghai`) with compiler type `"slang"` will result in a validation error.

If you don't set `evmVersion`, Hardhat picks one from the Solidity version. For Solidity versions below `0.8.25`, where that would be older than `cancun`, the plugin uses `cancun` instead.
