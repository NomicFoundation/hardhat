# End-to-End Test Harness

A local-first, scriptable harness for testing Hardhat against external repositories. It replaces the CI-only approach in `.github/workflows/regression-tests.yml` with a system that works identically on developer machines and in CI.

## Goals

1. **Regression testing before release** — clone external repos, install Hardhat from a local Verdaccio registry, run their test suites
2. **Local development feedback** — init a repo, iterate on Hardhat changes, re-run commands in the repo under test

## Directory Layout

```
hardhat/
  end-to-end/                                 # Test definitions (committed, formatted)
    <test-slug>/                              # One folder per external repo
      test.json                               # Test metadata
      preinstall.sh                           # (optional) Repo-specific patching script
  scripts/
    end-to-end/                               # Harness scripts (TypeScript, Node 24)
      test.ts                                 # Main CLI entry point
      init.ts                                 # Clone + preinstall logic
      exec.ts                                 # Command execution + output capture
      validate.ts                             # Schema validation
      schema/
        test-schema.ts                        # test.json types + type guard
        test.schema.json                      # JSON Schema for IDE support
      helpers/
        log.ts                                # Logging with styleText
        shell.ts                              # Shared shell execution helpers
        install.ts                            # Verdaccio install: writes .npmrc, runs npm
  end-to-end-repos/                           # Default clone directory (gitignored)
```

## CLI Interface

```
node scripts/end-to-end/test.ts [command] [options]
```

### Commands

<!-- prettier-ignore -->
| Command               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `--init <test-path>`  | Clone/setup the repo and install Hardhat from Verdaccio  |
| `--clean <test-path>` | Remove the work directory for a test (the cloned repo)   |
| _(none)_              | Print usage/help                                         |

`--init` accepts either a test directory path (e.g. `./end-to-end/openzeppelin-contracts`) or a path to a `test.json` file — both are normalized to the directory.

### Global Options

<!-- prettier-ignore -->
| Option                         | Description                                                             | Default                                  |
| ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------- |
| `--e2e-clone-dir <path>`       | Override clone directory                                                | `$E2E_CLONE_DIR` or `./end-to-end-repos` |
| `--start-verdaccio`            | Start Verdaccio (and publish all packages) before `--init`, stop after  | off                                      |

### Examples

```bash
# Initialize a test repo, managing Verdaccio lifecycle automatically
node scripts/end-to-end/test.ts --init ./end-to-end/openzeppelin-contracts --start-verdaccio

# Initialize when Verdaccio is already running (e.g. during local iteration)
node scripts/end-to-end/test.ts --init ./end-to-end/openzeppelin-contracts

# Clean up the cloned repo directory
node scripts/end-to-end/test.ts --clean ./end-to-end/openzeppelin-contracts

# Use a custom clone directory
node scripts/end-to-end/test.ts --init ./end-to-end/openzeppelin-contracts --e2e-clone-dir /tmp/e2e-repos
```

## Schema

### test.json (`type: "clone"`)

Clone a GitHub repo, apply optional patches, install from Verdaccio.

Only `"npm"` is supported as `packageManager` initially; pnpm and yarn can be added later.

<!-- prettier-ignore -->
| Field            | Type                     | Required | Description                                                                   |
| ---------------- | ------------------------ | -------- | ----------------------------------------------------------------------------- |
| `type`           | `"clone"`                | yes      | Discriminator                                                                 |
| `repo`           | `string`                 | yes      | GitHub repo in `org/name` format                                              |
| `commit`         | `string`                 | yes      | Full SHA or tag to checkout                                                   |
| `packageManager` | `"npm"`                  | yes      | Package manager used by the repo                                              |
| `preinstall`     | `string`                 | no       | Relative path to a shell script for patching the repo before install          |
| `install`        | `string`                 | no       | Relative path to a custom install script (overrides built-in Verdaccio flow)  |
| `commands`       | `string[]`               | no       | Commands to run after install (informational; for future automated runs)      |
| `tags`           | `string[]`               | yes      | Tags for filtering                                                            |
| `env`            | `Record<string, string>` | no       | Environment variables to set during install/exec                              |
| `submodules`     | `boolean`                | no       | Clone with `--recurse-submodules` (default: `false`)                          |

**Schema files**:

- `scripts/end-to-end/schema/test.schema.json` — JSON Schema (draft-07) for IDE autocomplete; referenced via `"$schema"` in each `test.json`
- `scripts/end-to-end/schema/test-schema.ts` — TypeScript types and manual type guards; used for runtime validation

```typescript
interface CloneTest {
  type: "clone";
  repo: string;
  commit: string;
  packageManager: "npm";
  preinstall?: string;
  install?: string;
  commands?: string[];
  tags: string[];
  env?: Record<string, string>;
  submodules?: boolean;
}
```

**First test definition** (`end-to-end/openzeppelin-contracts/test.json`):

```json
{
  "$schema": "../../scripts/end-to-end/schema/test.schema.json",
  "type": "clone",
  "repo": "kanej/openzeppelin-contracts",
  "commit": "36a5da9c6b130fa7a1c72f1150f1bd0dcee6e0d1",
  "packageManager": "npm",
  "preinstall": "./preinstall.sh",
  "tags": ["solidity-compile"]
}
```

## Init Flow (Idempotent)

Before running the install step, `--init` checks whether Verdaccio is running (PID file + `process.kill(pid, 0)`). If not running and `--start-verdaccio` was not passed, it exits with a clear message and instructions. If `--start-verdaccio` is passed, the command manages the full lifecycle: start → publish → init → stop (stop runs in a `finally` block).

```
init(testDir, cloneBaseDir)
  1. Read and validate test.json from testDir
  2. Compute clone path: <cloneBaseDir>/<test-slug>
     (e.g. end-to-end-repos/openzeppelin-contracts)
  3. Clone or update:
     a. If directory does not exist → git clone https://github.com/<repo>.git [--recurse-submodules]
     b. If directory exists → git fetch origin
  4. Checkout: git checkout <commit>
  5. Clean: git checkout . && git clean -fdx
  6. Run preinstall script (if specified in test.json)
  7. Write .npmrc (registry=http://localhost:4873) in clone dir
  8. Run install (custom script from test.json, or npm install)
```

## Clean Flow

```
clean(testDir, cloneBaseDir)
  1. Compute work path: <cloneBaseDir>/<test-slug>  (slug = basename of testDir)
  2. If directory exists → remove it (rmSync recursive)
  3. Log the path removed (or note that nothing existed)
```

## Verdaccio Integration

- `VERDACCIO_URL = http://localhost:4873` (defined in `scripts/verdaccio/helpers/shell.ts`)
- `isVerdaccioRunning()` in `scripts/verdaccio/helpers/shell.ts` checks the PID file and uses `process.kill(pid, 0)` to verify the process is alive

When `--start-verdaccio` is passed:

1. `start(true)` — start Verdaccio, wait for it to be ready
2. `publish(false, true)` — publish all packages to the local registry
3. `init(testDir, directory)` — clone, preinstall, install
4. `stop()` — always runs, even on error (finally block)

When `--start-verdaccio` is not passed and Verdaccio is not running:

```
Verdaccio is not running. Either start it manually:
  node scripts/verdaccio/install.ts --start --background
  node scripts/verdaccio/install.ts --publish --no-git-checks
Or pass --start-verdaccio to start it automatically.
```

### Custom Install Scripts

When `test.json` specifies an `install` field, that script runs instead of the built-in flow. It receives:

<!-- prettier-ignore -->
| Variable            | Value                                          |
| ------------------- | ---------------------------------------------- |
| `E2E_REPO_DIR`      | Absolute path to the cloned repo               |
| `E2E_HARDHAT_DIR`   | Absolute path to `v-next/hardhat/`             |
| `E2E_VERDACCIO_URL` | `http://localhost:4873`                        |
| `E2E_TEST_DIR`      | Absolute path to the test definition directory |

## Preinstall Scripts

Each test directory can contain a `preinstall.sh` that patches the cloned repo before installation. Scripts run with `cwd` set to the cloned repo and receive `E2E_TEST_DIR` as an environment variable.

**Example** (`end-to-end/openzeppelin-contracts/preinstall.sh`):

```bash
#!/usr/bin/env bash
set -e

cat > hardhat.config.js << 'HARDHAT_CONFIG'
export default {
  "solidity": {
    "version": "0.8.27",
    "optimizer": { "enabled": true, "runs": 200 },
    "evmVersion": "prague"
  }
};
HARDHAT_CONFIG

npm init -y
npm pkg set type="module"
```

## Intended Workflow

```bash
# Let --init manage the Verdaccio lifecycle
node scripts/end-to-end/test.ts --init ./end-to-end/openzeppelin-contracts --start-verdaccio

# Or, start Verdaccio manually then init
node scripts/verdaccio/install.ts --start --background
node scripts/verdaccio/install.ts --publish --no-git-checks
node scripts/end-to-end/test.ts --init ./end-to-end/openzeppelin-contracts

# Clean up when done
node scripts/end-to-end/test.ts --clean ./end-to-end/openzeppelin-contracts
```

## Script Conventions

All scripts under `scripts/end-to-end/` follow `scripts/README.md` patterns:

- **Runtime**: TypeScript, Node 24 type stripping (no build step)
- **Imports**: Use `.ts` extensions
- **CLI**: Parse `process.argv` directly, no external library
- **Schema validation**: Manual type guards, no external validators
- **Logging**: `styleText()` with `[e2e]` prefix
- **Shell**: `execFileSync` with lazy `which()` caching
- **Error handling**: `main()` with try/catch, `process.exit(1)` on error

## .gitignore

```gitignore
# End-to-end test harness
end-to-end-repos/
```
