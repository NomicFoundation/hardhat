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
node scripts/end-to-end/scenario.ts <command> --scenario <path> [options]
```

### Commands

Subcommands are positional arguments — exactly one must be provided.

<!-- prettier-ignore -->
| Command    | Description                                              |
| ---------- | -------------------------------------------------------- |
| `init`     | Clone/setup the repo and install Hardhat from Verdaccio  |
| `exec`     | Run a command in the scenario's working directory         |
| `clean`    | Remove the scenario's working directory                  |
| _(none)_   | Print usage/help                                         |

### Options

<!-- prettier-ignore -->
| Option                         | Description                                                                    | Default                                  |
| ------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------- |
| `--scenario <path>`            | Scenario directory or `scenario.json` path (required)                          |                                          |
| `--e2e-clone-dir <path>`       | Override clone directory                                                       | `$E2E_CLONE_DIR` or `./end-to-end-repos` |
| `--command <cmd>`              | Command to run (required with `exec`)                                          |                                          |
| `--with-verdaccio`             | Start Verdaccio (and publish all packages) before the command, stop after      | off                                      |
| `--with-init`                  | Run `init` before `exec`                                                       | off                                      |

`--scenario` accepts either a scenario directory (e.g. `./end-to-end/openzeppelin-contracts`) or a path to its `scenario.json` — both are normalized to the `scenario.json` path internally.

### Examples

```bash
# Initialize a test repo, managing Verdaccio lifecycle automatically
node scripts/end-to-end/scenario.ts init --scenario ./end-to-end/openzeppelin-contracts --with-verdaccio

# Initialize when Verdaccio is already running (e.g. during local iteration)
node scripts/end-to-end/scenario.ts init --scenario ./end-to-end/openzeppelin-contracts

# Run a command in the scenario's working directory
node scripts/end-to-end/scenario.ts exec --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat compile"

# Init + exec in one step with Verdaccio lifecycle
node scripts/end-to-end/scenario.ts exec --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat test" --with-verdaccio --with-init

# Clean up the cloned repo directory
node scripts/end-to-end/scenario.ts clean --scenario ./end-to-end/openzeppelin-contracts

# Use a custom clone directory
node scripts/end-to-end/scenario.ts init --scenario ./end-to-end/openzeppelin-contracts --e2e-clone-dir /tmp/e2e-repos
```

## Schema

### scenario.json

Clone a GitHub repo, apply optional patches, install from Verdaccio.

Only `"npm"` is supported as `packageManager` initially; pnpm and yarn can be added later.

<!-- prettier-ignore -->
| Field            | Type                     | Required | Description                                                                   |
| ---------------- | ------------------------ | -------- | ----------------------------------------------------------------------------- |
| `repo`           | `string`                 | yes      | GitHub repo in `org/name` format                                              |
| `commit`         | `string`                 | yes      | Full SHA or tag to checkout                                                   |
| `packageManager` | `"npm"`                  | yes      | Package manager used by the repo                                              |
| `preinstall`     | `string`                 | no       | Relative path to a shell script for patching the repo before install          |
| `install`        | `string`                 | no       | Relative path to a custom install script (overrides built-in Verdaccio flow)  |
| `tags`           | `string[]`               | yes      | Tags for filtering                                                            |
| `env`            | `Record<string, string>` | no       | Environment variables to set during install/exec                              |
| `submodules`     | `boolean`                | no       | Initialize and update submodules after checkout (default: `false`)            |

**Schema files**:

- `scripts/end-to-end/schema/scenario.schema.json` — JSON Schema (draft-07) for IDE autocomplete; referenced via `"$schema"` in each `scenario.json`
- `scripts/end-to-end/schema/scenario-schema.ts` — TypeScript types and manual type guards; used for runtime validation

```typescript
interface ScenarioDefinition {
  repo: string;
  commit: string;
  packageManager: "npm";
  preinstall?: string;
  install?: string;
  tags: string[];
  env?: Record<string, string>;
  submodules?: boolean;
}
```

**First scenario definition** (`end-to-end/openzeppelin-contracts/scenario.json`):

```json
{
  "$schema": "../../scripts/end-to-end/schema/scenario.schema.json",
  "repo": "kanej/openzeppelin-contracts",
  "commit": "36a5da9c6b130fa7a1c72f1150f1bd0dcee6e0d1",
  "packageManager": "npm",
  "preinstall": "./preinstall.sh",
  "tags": ["solidity-compile"]
}
```

## Init Flow (Idempotent)

Before running the install step, `init` checks whether Verdaccio is running (PID file + `process.kill(pid, 0)`). If not running and `--with-verdaccio` was not passed, it exits with a clear message and instructions. If `--with-verdaccio` is passed, the command manages the full lifecycle: start → publish → init → stop (stop runs in a `finally` block).

```
init(testDir, cloneBaseDir)
  1. Read and validate test.json from testDir
  2. Compute clone path: <cloneBaseDir>/<test-slug>
     (e.g. end-to-end-repos/openzeppelin-contracts)

  Fresh clone (directory does not exist):
  3a. git clone https://github.com/<repo>.git
  4a. git checkout <commit>
  5a. git submodule update --init --recursive (if submodules: true)

  Re-init (directory exists):
  3b. git fetch origin
  4b. git checkout <commit>
  5b. git checkout . && git clean -fdx
  6b. git submodule update --init --recursive (if submodules: true)

  Shared:
  6/7. Run preinstall script (if specified in test.json)
  7/8. Write .npmrc (registry=http://localhost:4873) in clone dir
  8/9. Run install (custom script from test.json, or npm install)
```

## Exec Flow

```
exec(scenarioPath, cloneBaseDir, command, withInit, withVerdaccio)
  1. Load scenario definition from scenarioPath
  2. If --with-verdaccio: start Verdaccio, publish packages
  3. If --with-init: run init (reuses running Verdaccio if started in step 2)
  4. Run command in the scenario's working directory (stdio: inherit)
  5. If --with-verdaccio: stop Verdaccio (in finally block)
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

When `--with-verdaccio` is passed:

1. `start(true)` — start Verdaccio, wait for it to be ready
2. `publish(false, true)` — publish all packages to the local registry
3. `init(testDir, directory)` — clone, preinstall, install
4. `stop()` — always runs, even on error (finally block)

When `--with-verdaccio` is not passed and Verdaccio is not running:

```
Verdaccio is not running. Either start it manually:
  node scripts/verdaccio/install.ts --start --background
  node scripts/verdaccio/install.ts --publish --no-git-checks
Or pass --with-verdaccio to start it automatically.
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
# Init + run a command in one step
node scripts/end-to-end/scenario.ts exec --scenario ./end-to-end/openzeppelin-contracts \
  --command "npx hardhat compile" --with-verdaccio --with-init

# Or, init separately then iterate on exec
node scripts/end-to-end/scenario.ts init --scenario ./end-to-end/openzeppelin-contracts --with-verdaccio
node scripts/end-to-end/scenario.ts exec --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat compile"
node scripts/end-to-end/scenario.ts exec --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat test"

# Clean up when done
node scripts/end-to-end/scenario.ts clean --scenario ./end-to-end/openzeppelin-contracts
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
