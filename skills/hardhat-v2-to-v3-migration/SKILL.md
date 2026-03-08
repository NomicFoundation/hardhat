---
name: hardhat-v2-to-v3-migration
description: Systematically migrate a Hardhat V2 project to Hardhat V3, covering core changes (ESM, declarative config, hooks system, network connections) and the full plugin ecosystem including hardhat-deploy, hardhat-gas-reporter, hardhat-contract-sizer, hardhat-verify, @openzeppelin/hardhat-upgrades, coverage tools, and test migration. Use when upgrading any production Hardhat V2 repository to V3.
---

# Hardhat V2 to V3 Migration

Comprehensive guide for AI agents to systematically migrate a Hardhat V2 project to Hardhat V3. This covers not just the core framework changes but the entire plugin and tooling ecosystem that production projects depend on.

## When to Use This Skill

- Migrating any Hardhat V2 project to Hardhat V3
- Upgrading a production Solidity project with multiple plugins and custom tasks
- Resolving compatibility issues when moving to Hardhat V3's ESM-first architecture
- Converting Hardhat V2 test suites (Mocha/Chai) to work with V3's explicit network connections
- Replacing deprecated Hardhat V2 plugins with their V3 equivalents or built-in alternatives

## Prerequisites

- Node.js v22.10.0 or later
- An existing Hardhat V2 project
- Familiarity with the project's plugin dependencies

## Official References

Before starting, fetch the latest official documentation:

- **Migration guide**: https://hardhat.org/docs/migrate-from-hardhat2
- **Mocha test migration**: https://hardhat.org/docs/migrate-from-hardhat2/guides/mocha-tests
- **Configuration reference**: https://hardhat.org/docs/reference/configuration
- **Beta status and missing features**: https://hardhat.org/docs/learn-more/beta-status
- **Migration blockers tracker**: https://github.com/NomicFoundation/hardhat/issues/7207

---

# Migration Process

## Phase 1: Audit and Inventory

Before changing any code, create a full inventory of the project's Hardhat ecosystem.

### 1.1 Catalog All Dependencies

Scan `package.json` for every Hardhat-related dependency:

```bash
grep -E "hardhat|@nomicfoundation|@nomiclabs|@openzeppelin|solidity-coverage|solhint|solidity-docgen" package.json
```

Create a checklist with each dependency and its migration path (see the Plugin Migration Map in Phase 3).

### 1.2 Catalog Custom Tasks and Scripts

Identify all custom tasks, scripts, and config extensions:

```bash
grep -rn "task\|subtask\|extendConfig\|extendEnvironment" hardhat.config.*
```

Review the `scripts/` directory for any Hardhat-dependent deploy or utility scripts.

### 1.3 Catalog Test Infrastructure

Identify test patterns in use:

- Test runner (Mocha, or other)
- Assertion library (Chai with hardhat-chai-matchers, Waffle)
- Network helpers (`@nomicfoundation/hardhat-network-helpers`)
- Ethers.js version and usage of `hre.ethers`
- Any fixtures or shared test utilities relying on `hre.network.provider`

### 1.4 Check for Migration Blockers

Review https://github.com/NomicFoundation/hardhat/issues/7207 for known blockers. If the project depends on a plugin or feature not yet available in V3, document it and plan a workaround or deferral.

---

## Phase 2: Core Migration

Follow these steps in order. Each step should be verified before moving to the next.

### 2.1 Prepare the V2 Project

**Clean caches and artifacts:**

```bash
npx hardhat clean
```

**Rename the old config for reference:**

```bash
mv hardhat.config.js hardhat.config.old.js
# or
mv hardhat.config.ts hardhat.config.old.ts
```

### 2.2 Make the Project ESM

Add `"type": "module"` to `package.json`:

```bash
npm pkg set type=module
```

If the project has a `tsconfig.json`, ensure `compilerOptions.module` is set to an ESM-compatible value:

```json
{
  "compilerOptions": {
    "module": "node16",
    "moduleResolution": "node16"
  }
}
```

### 2.3 Remove All Hardhat V2 Dependencies

Remove these categories of packages from `package.json`:

- `hardhat` (the V2 version)
- `solidity-coverage`, `hardhat-gas-reporter`
- Any packages starting with `hardhat-`, `@nomicfoundation/`, or `@nomiclabs/`
- `@typechain/*`, `typechain`

Then reinstall and verify no Hardhat V2 dependencies remain:

```bash
npm install
npm why hardhat
```

Repeat `npm why hardhat` (or `pnpm why hardhat` / `yarn why hardhat`) until no Hardhat-related transitive dependencies remain.

### 2.4 Install Hardhat V3

```bash
npm add --save-dev hardhat
```

### 2.5 Create the New Config

Create `hardhat.config.ts` with minimal content:

```typescript
import { defineConfig } from "hardhat/config";

export default defineConfig({});
```

Verify it works:

```bash
npx hardhat --help
```

### 2.6 Migrate the Solidity Configuration

Copy the `solidity` field from the old config. The format is backwards-compatible:

```typescript
import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    // copy from old config as-is
  },
});
```

Verify compilation:

```bash
npx hardhat build
```

### 2.7 Migrate Network Configuration

Networks in V3 require explicit `type` and `chainType` fields:

**V2 (old):**
```javascript
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
  },
}
```

**V3 (new):**
```typescript
import { defineConfig, configVariable } from "hardhat/config";

export default defineConfig({
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
```

Key changes:
- `type` is required: `"http"` for remote networks, `"edr-simulated"` for local
- `chainType` is optional and falls back to `defaultChainType` (default `"generic"`), but it's recommended to set it explicitly (e.g. `"l1"`, `"op"`, or `"generic"`, especially for `edr-simulated` networks)
- Environment variables use `configVariable()` instead of `process.env`
- The default Hardhat network is now `"edr-simulated"` type
- Prefer the EIP-1193-compliant `provider.request({ method: "method" })` instead of the deprecated `provider.send("method")`

---

## Phase 3: Plugin Ecosystem Migration

This is typically the most involved phase. Each V2 plugin must be mapped to its V3 equivalent.

### Plugin Migration Map

| V2 Plugin | V3 Status | V3 Replacement |
|---|---|---|
| `@nomicfoundation/hardhat-ethers` | Replaced | Included in `@nomicfoundation/hardhat-toolbox-mocha-ethers` |
| `@nomicfoundation/hardhat-chai-matchers` | Replaced | `@nomicfoundation/hardhat-ethers-chai-matchers` (bundled by `@nomicfoundation/hardhat-toolbox-mocha-ethers`) |
| `@nomicfoundation/hardhat-network-helpers` | Replaced | Now a plugin; helpers come from `network.connect()` |
| `@nomicfoundation/hardhat-verify` | Available | Included in toolbox; see verification guide |
| `@nomicfoundation/hardhat-ignition` | Available | Included in toolbox; see Ignition docs |
| `hardhat-gas-reporter` | Built-in | Use built-in gas analytics via `--gas-stats` (e.g. `npx hardhat test --gas-stats`) |
| `hardhat-contract-sizer` | Not yet ported | Check migration blockers issue; may need custom task |
| `hardhat-deploy` (wighawag) | V2 available | `hardhat-deploy` v2.x works with Hardhat V3 via rocketh |
| `@openzeppelin/hardhat-upgrades` | Check status | Monitor OpenZeppelin repos for V3 support |
| `solidity-coverage` | Replaced | Coverage is built into Hardhat v3 via the global `--coverage` flag (no plugin needed) |
| `@typechain/hardhat` | Replaced | TypeChain is integrated into the Ethers toolbox |
| `hardhat-docgen` / `solidity-docgen` | Not yet ported | Check migration blockers issue |
| `@nomiclabs/hardhat-etherscan` | Deprecated | Use `@nomicfoundation/hardhat-verify` via toolbox |
| `@nomiclabs/hardhat-waffle` | Deprecated | Migrate to `hardhat-toolbox-mocha-ethers` |
| `solhint` / `prettier-plugin-solidity` | No migration needed | Independent of Hardhat; keep as-is |

### 3.1 Install the Recommended Toolbox

For Mocha + Ethers.js projects (most common):

```bash
npm add --save-dev @nomicfoundation/hardhat-toolbox-mocha-ethers
```

For Viem projects:

```bash
npm add --save-dev @nomicfoundation/hardhat-toolbox-viem
```

### 3.2 Register Plugins Declaratively

In V2, plugins were registered by side-effect imports. In V3, plugins must be explicitly imported and added to the `plugins` array:

**V2 (old):**
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
```

**V3 (new):**
```typescript
import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    // ...
  },
});
```

### 3.3 hardhat-deploy Migration

If using `wighawag/hardhat-deploy`, upgrade to v2.x which is compatible with Hardhat V3:

```bash
npm add --save-dev hardhat-deploy@latest
```

The v2 release is a full rewrite using rocketh as its underlying framework. Key changes:
- Deploy scripts are now TypeScript functions (no DSL)
- ESM module support
- New plugin system via rocketh extensions

Refer to https://github.com/wighawag/hardhat-deploy for the full v1-to-v2 migration guide.

### 3.4 @openzeppelin/hardhat-upgrades Migration

Check the OpenZeppelin Hardhat Upgrades repository for V3 compatibility. If not yet available:
- Pin the project to the last compatible version
- Track https://github.com/NomicFoundation/hardhat/issues/7207 for updates
- Consider using OpenZeppelin Defender or manual proxy deployment as a temporary alternative

### 3.5 hardhat-gas-reporter

Hardhat V3 includes built-in gas analytics. Remove `hardhat-gas-reporter` and use the `--gas-stats` flag instead:

```bash
npx hardhat test --gas-stats
```

This outputs a table with min, average, median, max gas costs per function, plus deployment cost and size. See https://hardhat.org/docs/guides/gas-statistics for details.

### 3.6 hardhat-contract-sizer

No official V3 port exists yet. Options:
- Write a custom Hardhat V3 task that reads artifact sizes from the `artifacts/` directory
- Use `solc --size` output directly
- Track the migration blockers issue for updates

### 3.7 Verification (hardhat-verify / hardhat-etherscan)

The `@nomicfoundation/hardhat-verify` plugin is included in both V3 toolboxes. Configuration:

```typescript
import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  etherscan: {
    apiKey: configVariable("ETHERSCAN_API_KEY"),
  },
});
```

Refer to https://hardhat.org/docs/guides/smart-contract-verification for the full verification guide.

### 3.8 TypeChain

TypeChain is now integrated into the Ethers toolbox. Configuration is available via the `typechain` field in the config:

```typescript
export default defineConfig({
  typechain: {
    outDir: "./types",
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false,
  },
});
```

---

## Phase 4: Test Migration

### 4.1 ESM Syntax

Since V3 is ESM-first, test files with `.js` extension are treated as ES modules. Options:
- **Convert to ESM** (recommended): Replace `require()` with `import`, `module.exports` with `export`
- **Rename to `.cjs`**: Keep CommonJS syntax but rename files

Key ESM changes:
- `__dirname` becomes `import.meta.dirname`
- `__filename` becomes `import.meta.filename`
- Relative imports must include the file extension: `import x from "./x.js"`

### 4.2 Network Connections

The biggest test migration change. `hre.network.provider` no longer exists as a global. Create explicit connections:

**V2 (old):**
```javascript
const { ethers } = require("hardhat");

describe("MyContract", function () {
  it("should deploy", async function () {
    const contract = await ethers.deployContract("MyContract");
  });
});
```

**V3 (new):**
```typescript
import hre from "hardhat";

const { ethers } = await hre.network.connect();

describe("MyContract", function () {
  it("should deploy", async function () {
    const contract = await ethers.deployContract("MyContract");
  });
});
```

For CommonJS tests (`.cjs`), use `before` blocks:

```javascript
describe("MyContract", function () {
  let ethers;

  before(async function () {
    const hre = await import("hardhat");
    ({ ethers } = await hre.network.connect());
  });

  it("should deploy", async function () {
    const contract = await ethers.deployContract("MyContract");
  });
});
```

### 4.3 Chai Matchers

Several matchers changed to support multiple network connections:

| V2 Matcher | V3 Matcher |
|---|---|
| `.changeEtherBalance(account, amount)` | `.changeEtherBalance(ethers, account, amount)` |
| `.changeEtherBalances(accounts, amounts)` | `.changeEtherBalances(ethers, accounts, amounts)` |
| `.changeTokenBalance(token, account, amount)` | `.changeTokenBalance(ethers, token, account, amount)` |
| `.changeTokenBalances(token, accounts, amounts)` | `.changeTokenBalances(ethers, token, accounts, amounts)` |
| `.revertedWithoutReason()` | `.revertedWithoutReason(ethers)` |
| `.reverted` | `.revert(ethers)` |

The `ethers` parameter is the object from `hre.network.connect()`.

### 4.4 Network Helpers

Network helpers are now a plugin and come from the network connection:

**V2 (old):**
```javascript
const { mine, time } = require("@nomicfoundation/hardhat-network-helpers");
await mine(5);
```

**V3 (new):**
```typescript
import { network } from "hardhat";

const { networkHelpers } = await network.connect();
await networkHelpers.mine(5);
```

### 4.5 loadFixture Pattern

`loadFixture` is commonly used in V2 tests for reusable setup. In V3, it comes from the network connection:

**V2 (old):**
```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployFixture() {
  const [owner] = await ethers.getSigners();
  const contract = await ethers.deployContract("MyContract");
  return { contract, owner };
}

describe("MyContract", function () {
  it("should work", async function () {
    const { contract, owner } = await loadFixture(deployFixture);
  });
});
```

**V3 (new):**
```typescript
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.connect();

async function deployFixture() {
  const [owner] = await ethers.getSigners();
  const contract = await ethers.deployContract("MyContract");
  return { contract, owner };
}

describe("MyContract", function () {
  it("should work", async function () {
    const { contract, owner } = await networkHelpers.loadFixture(deployFixture);
  });
});
```

### 4.6 Run Tests Incrementally

Migrate one test file at a time and verify:

```bash
npx hardhat test test/some-test.ts
```

Only run the full suite after all individual files pass.

---

## Phase 5: Custom Tasks Migration

### 5.1 Task Definition

**V2 (old):**
```javascript
task("accounts", "Prints the accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});
```

**V3 (new):**
```typescript
import { defineConfig, task } from "hardhat/config";

const printAccounts = task("accounts", "Print the accounts")
  .setInlineAction(async (taskArguments, hre) => {
    const { provider } = await hre.network.connect();
    console.log(await provider.request({ method: "eth_accounts" }));
  })
  .build();

export default defineConfig({
  tasks: [printAccounts],
});
```

Key changes:
- Tasks use a builder pattern with `.build()`
- Tasks must be added to the `tasks` array in the config
- `setInlineAction` for simple tasks, `setAction` with a separate file for lazy loading
- `hre.ethers` is no longer global; use `hre.network.connect()` to get ethers

### 5.2 Subtask Migration

Subtask overriding is replaced by the hooks system. The `extendConfig` and `extendEnvironment` extensibility points are replaced by hooks. Refer to https://hardhat.org/docs/plugin-development/explanations/hooks for the hooks API.

---

## Phase 6: Verification and Cleanup

### 6.1 Full Build

```bash
npx hardhat build
```

### 6.2 Full Test Suite

```bash
npx hardhat test
```

### 6.3 Verify Deployments (if applicable)

Run a test deployment to a local or testnet to verify the deploy pipeline works end-to-end.

### 6.4 Cleanup

- Remove `hardhat.config.old.js` / `hardhat.config.old.ts`
- Remove any leftover V2-only dependencies from `package.json`
- Remove stale lockfile entries: `npm install` or `pnpm install`
- Update CI/CD pipelines to use Node.js v22.10.0+
- Update any documentation referencing V2-specific commands or config

### 6.5 Known Gaps to Monitor

Track these items for future resolution:
- `hardhat-contract-sizer`: no official V3 port yet
- `hardhat-docgen` / `solidity-docgen`: no official V3 port yet
- Plugin APIs are still in beta; expect minor breaking changes

Report any new blockers at https://github.com/NomicFoundation/hardhat/issues/7207.

---

## Quick Reference: V2 vs V3 Equivalents

| Concept | Hardhat V2 | Hardhat V3 |
|---|---|---|
| Config format | `module.exports = {}` | `export default defineConfig({})` |
| Module system | CommonJS | ESM (`.js` = ESM) |
| Plugin registration | `require("plugin")` side-effect | `plugins: [plugin]` array in config |
| Network access | `hre.network.provider` global | `await hre.network.connect()` explicit |
| Ethers access | `hre.ethers` global | `const { ethers } = await hre.network.connect()` |
| Environment variables | `process.env.X` | `configVariable("X")` |
| Task definition | `task("name", async (args, hre) => {})` | `task("name").setInlineAction(...).build()` |
| Tasks in config | Registered by side effect | `tasks: [task1, task2]` array |
| Subtasks | `subtask("name", ...)` | Hooks system |
| `extendConfig` | `extendConfig(fn)` | Hooks system |
| `extendEnvironment` | `extendEnvironment(fn)` | Hooks system |
| Network helpers | `require("hardhat-network-helpers")` | `const { networkHelpers } = await network.connect()` |
| Compilation command | `npx hardhat compile` | `npx hardhat build` |
| Clean command | `npx hardhat clean` | `npx hardhat clean` |
| Default network type | Implicit | `"edr-simulated"` with `chainType` |

---

## Troubleshooting

### "Cannot use require() in ES module"
Your project is now ESM. Convert `require()` to `import` or rename the file to `.cjs`.

### "ERR_MODULE_NOT_FOUND" for relative imports
ESM requires file extensions in relative imports. Change `import x from "./x"` to `import x from "./x.js"`.

### "hre.network.provider is not a function"
V3 uses explicit connections. Replace `hre.network.provider.send(...)` with:
```typescript
const { provider } = await hre.network.connect();
await provider.request({ method: "eth_blockNumber" });
```

### "Plugin X is not compatible with Hardhat 3"
Check the plugin migration map above. If no V3 version exists, report it at https://github.com/NomicFoundation/hardhat/issues/7207.

### TypeScript compilation errors after migration
Ensure `tsconfig.json` has `"module": "node16"` and `"moduleResolution": "node16"`. Remove any `@types/` packages for deprecated V2 plugins.

### Tests timeout or hang
The `hre.network.connect()` call is async. Ensure all `before` blocks properly await the connection. Increase Mocha timeouts if needed via the `test.mocha.timeout` config field.
