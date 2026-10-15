# Hardhat Slang plugin

This plugin enables the new `slang` Solidity compiler in Hardhat.

The `slang` compiler is experimental and is not ready for production use-cases. Use it for test builds and test execution locally, and keep using `solc` for production use-cases (including during deployment, for example with `hardhat-ignition` and in your CI). Care should be taken before enabling compilation with `slang` in other build profiles, see the configuration flags below.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-slang
```

Then add the plugin to your `hardhat.config.ts`, pin a `slang` release, and create a `slang` build profile. You must use the build profiles config format, which requires both a `default` and a `slang` profile:

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
  slang: {
    version: "0.1.0-pre.2026-10-01",
  },
});
```

The `default` profile uses solc as usual. The `slang` profile uses the slang compiler, identified by `type: "slang"`. The `version` of a `type: "slang"` entry is still the Solidity version, exactly as with solc: Hardhat uses it to resolve pragmas and group files into compilation jobs. Which `slang` binary compiles them is decided separately, by `slang.version`.

## Usage

Run tests or compile using the slang build profile:

```bash
hardhat test --build-profile slang
hardhat build --build-profile slang
```

The default profile continues to use solc as usual:

```bash
hardhat build    # uses solc (default profile)
```

## Configuration

### Pinning a slang release

Unlike solc, one `slang` binary compiles a range of Solidity versions (`0.8.x`). The plugin therefore downloads a single release, the one pinned in `slang.version`, and uses it for every `type: "slang"` compiler entry. Each entry's Solidity `version` must fall inside the range supported by the pinned release (see [Supported Solidity versions](#supported-solidity-versions)); anything outside is a validation error.

`slang.version` is required whenever a `type: "slang"` entry needs a download. Entries with a custom `path` (see below) don't.

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
          { type: "slang", version: "0.8.34" }, // compiled by the pinned slang release
          { type: "slang", version: "0.8.20" }, // same binary, different Solidity version
          { version: "0.7.6" }, // uses solc; outside the slang range
        ],
      },
    },
  },
  slang: {
    version: "0.1.0-pre.2026-10-01",
  },
});
```

### Options

- `version` (`string`), the slang release to download and compile with. See [Supported Solidity versions](#supported-solidity-versions) for the known releases.
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
    version: "0.1.0-pre.2026-10-01",
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
  slang: {
    version: "0.1.0-pre.2026-10-01",
  },
});
```

### Supported Solidity versions

Each slang release supports a range of Solidity versions:

| slang release | Solidity versions | Notes |
| --- | --- | --- |
| `0.1.0-pre.2026-10-01` | `0.8.0` to `0.8.37` | Internal prerelease (solx tag `b74af542`, 2026-10-01) downloaded from GitHub. |

### EVM version support

slang supports EVM versions `cancun`, `prague`, and `osaka`. Using an older EVM target (e.g., `paris`, `shanghai`) with compiler type `"slang"` will result in a validation error.
