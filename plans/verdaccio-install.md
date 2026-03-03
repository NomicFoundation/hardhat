# Verdaccio Local Registry

A script to manage a local Verdaccio npm registry for testing Hardhat packages. Publishes all packages so external repos can install from `http://localhost:4873`.

## CLI Interface

All commands go through the single entry point, with `pnpm` aliases defined in root `package.json`:

<!-- prettier-ignore -->
| pnpm alias               | Equivalent                                    |
| ------------------------ | --------------------------------------------- |
| `pnpm verdaccio:help`    | `node scripts/verdaccio/install.ts`           |
| `pnpm verdaccio:start`   | `node scripts/verdaccio/install.ts --start`   |
| `pnpm verdaccio:publish` | `node scripts/verdaccio/install.ts --publish` |
| `pnpm verdaccio:stop`    | `node scripts/verdaccio/install.ts --stop`    |

Options are appended after the alias, e.g. `pnpm verdaccio:start --background`.

### Commands

<!-- prettier-ignore -->
| Command     | Description                                 |
| ----------- | ------------------------------------------- |
| `--start`   | Start the Verdaccio server                  |
| `--publish` | Build and publish all packages to Verdaccio |
| `--stop`    | Stop the running Verdaccio instance         |
| _(none)_    | Print usage/help                            |

### Options

<!-- prettier-ignore -->
| Option            | Description                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `--background`    | Run Verdaccio in the background (use with `--start`)                                                |
| `--no-git-checks` | Skip the clean working tree check (use with `--publish`)                                            |
| `--changes`       | Re-publish only packages with uncommitted changes (use with `--publish`, implies `--no-git-checks`) |

### Examples

```bash
# Start the registry (foreground — runs in current terminal)
pnpm verdaccio:start

# Start the registry (background — detached process)
pnpm verdaccio:start --background

# Build and publish all v-next packages
pnpm verdaccio:publish

# Re-publish only packages with uncommitted changes
pnpm verdaccio:publish --changes

# Stop the registry
pnpm verdaccio:stop
```

## Start Flow

The `--start` command starts a fresh Verdaccio instance:

```
start(background)
  1. Kill existing instance (if .verdaccio/verdaccio.pid exists and process is alive)
  2. Fresh runtime dir (delete and recreate .verdaccio/)
  3. Generate verdaccio config (.verdaccio/config.yaml)
     - Foreground (default): log type: stdout, format: pretty
     - Background (--background): log type: file, path: .verdaccio/server.log
  4. Write auth files (pre-seeded htpasswd + .npmrc with basic auth)
  5. Start verdaccio on 0.0.0.0:4873, PID to file
     - Foreground (default): stdio: "inherit", SIGINT/SIGTERM cleanup handlers
     - Background (--background): spawn detached, log to file, unref()
  6. Wait for ready (poll GET /-/ping, 30s timeout)
  7. Print setup complete (registry URL, PID, next steps)
     - Foreground: "Press Ctrl+C to stop"
     - Background: "To stop: pnpm verdaccio:stop"
```

## Publish Flow

The `--publish` command builds and publishes packages to the running Verdaccio:

```
publish(changes, noGitChecks)
  1. Check clean working tree (skipped if --no-git-checks or --changes)
  2. Verify Verdaccio is running (check PID file and process)
  3. If --changes:
     a. Detect changed packages (git status --porcelain -- v-next/)
     b. If no changes found, print message and return
     c. Unpublish each changed package from verdaccio (npm unpublish <name>@<version>)
     d. Log which packages will be re-published
  4. Build and publish to verdaccio
     - --changes: pnpm publish --filter "./v-next/hardhat" --filter "./v-next/hardhat-errors" ...
     - no flag: pnpm publish --filter "./v-next/**" (all packages)
  5. Report summary (read pnpm-publish-summary.json, print each package)
     - If 0 packages published: hint to run `pnpm version-for-release` or `pnpm verdaccio:publish --changes`
```

Building happens automatically as a pre-publish step via each package's `prepublishOnly` script.

Packages are published if their version differs from what is already in the registry. Use `--changes` to detect packages with uncommitted edits, unpublish them from verdaccio, and re-publish only those (useful for local iteration without changing versions).

## Stop Flow

```
stop()
  1. Read PID from .verdaccio/verdaccio.pid
  2. SIGTERM the process
  3. Remove PID file
```

## Verdaccio Configuration

Generated at `.verdaccio/config.yaml` with absolute paths:

```yaml
storage: <root>/.verdaccio/storage
auth:
  htpasswd:
    file: <root>/.verdaccio/htpasswd
    max_users: -1
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  "@nomicfoundation/*":
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  "hardhat":
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  "**":
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
log:
  # Foreground (default):
  type: stdout
  format: pretty
  level: http
  # Background (--background):
  type: file
  path: <root>/.verdaccio/server.log
  level: warn
```

Key design decisions:

- **`proxy: npmjs` for all packages** — verdaccio checks npm when resolving versions. This means `pnpm publish` skips versions that already exist on npm. Use `--changes` to unpublish and re-publish packages with local edits. During install, locally published versions take priority over npm.
- **`unpublish: $authenticated`** — enables the `--changes` flow to unpublish specific packages before re-publishing them with the same version.
- **Fresh storage on start** — `--start` deletes and recreates `.verdaccio/`, so previous publications never interfere.

## Auth (No Login Dance)

Auth is fully pre-seeded at start time — no API calls or interactive login required:

1. **htpasswd** is pre-generated with a known `test` user. Password hash uses the `{SHA}` format: `{SHA}` + base64(sha1("test")). Verdaccio config sets `max_users: -1` to disable registration.
2. **`.npmrc`** is written with basic auth: `//localhost:4873/:_auth=` + base64("test:test"). This is scoped to the verdaccio registry only.
3. `pnpm publish` uses this via `NPM_CONFIG_USERCONFIG` env var — scoped to the publish subprocess only, project `.npmrc` still applies for other settings.

## Runtime Directory

All state lives in `.verdaccio/` at the project root (gitignored):

```
.verdaccio/
  config.yaml      Generated verdaccio configuration
  storage/         Published package tarballs
  htpasswd         User authentication file
  .npmrc           Auth token for pnpm publish
  server.log       Server output log
  verdaccio.pid    PID of the running process
```

Starting a new instance (`--start`) always starts fresh — the directory is deleted and recreated.

## Publish Command

```bash
pnpm publish --filter "./v-next/**" -r --no-git-checks --access public --report-summary --registry http://localhost:4873
```

- `--no-git-checks` — required because the working tree may be dirty
- `--report-summary` — generates `pnpm-publish-summary.json` (already gitignored)
- `--registry` — targets the local Verdaccio instance
- Auth token provided via `NPM_CONFIG_USERCONFIG` pointing to `.verdaccio/.npmrc`

## File Structure

```
scripts/verdaccio/
  install.ts      Entry point (USAGE, main, arg parsing)
  server.ts       Programmatic verdaccio entry point (spawned by start)
  start.ts        start() + private helpers (config, auth, spawn, wait)
  publish.ts      publish() + private helpers (detect, unpublish, publish, report)
  stop.ts         stop()
  helpers.ts      Shared constants, fmt, logging, shell helpers
```

- `install.ts` — CLI entry point. Parses `process.argv`, dispatches to `start`/`publish`/`stop`, holds the `USAGE` constant.
- `server.ts` — Minimal verdaccio entry point using the programmatic `runServer` API. Spawned as a child process by `start.ts` (avoids the deprecated CLI bootstrap and its warning). Receives config path, host, and port as argv.
- `helpers.ts` — Exports shared constants (`ROOT_DIR`, `VERDACCIO_*`), `fmt` formatting object, logging (`log`, `logStep`, `logError`), and shell helpers (`git`, `npm`, `pnpm`, `sleep`).
- `start.ts` — Exports `start(background)`. All start steps are private functions within this file.
- `publish.ts` — Exports `publish(changes)`. All publish steps are private functions within this file.
- `stop.ts` — Exports `stop()`.

## Script Conventions

Follows `scripts/README.md` and `scripts/bump-peers.ts` patterns:

- **Runtime**: TypeScript, Node 24 type stripping (no build step)
- **Imports**: `.ts` extensions, `node:` prefix for builtins
- **CLI**: Parse `process.argv` directly, bare run = usage
- **Logging**: `[verdaccio]` prefix + `node:util.styleText()`
- **Shell**: `execFileSync` with lazy `which()` caching, `pnpm()` helper extended with `stdio` and `env` options
- **Error handling**: async `main()` with try/catch, `process.exit(1)` on error
- **Constants**: `ROOT_DIR = resolve(import.meta.dirname, "../..")` (two levels up from `scripts/verdaccio/`)

## Dependencies

- `verdaccio` added as root devDependency in `package.json`
- Used via programmatic `runServer` API (imported in `server.ts`), not the CLI binary — avoids the deprecated `startVerdaccio` bootstrap

## Intended Workflows

### Before a release: test external repos against new versions

```bash
# Start the registry (foreground — in a dedicated terminal)
pnpm verdaccio:start

# In another terminal: publish and test
pnpm verdaccio:publish

# In an external repo, install from verdaccio
cd /path/to/external-repo
npm install --registry http://localhost:4873
npx hardhat compile

# When done, Ctrl+C in the verdaccio terminal
```

### Background mode: single terminal workflow

```bash
# Start the registry in the background
pnpm verdaccio:start --background
pnpm verdaccio:publish

# In an external repo, install from verdaccio
cd /path/to/external-repo
npm install --registry http://localhost:4873

# When done
pnpm verdaccio:stop
```

### Local iteration: rebuild and re-publish

```bash
pnpm verdaccio:start
pnpm verdaccio:publish

# Make changes to hardhat, then re-publish only changed packages
pnpm verdaccio:publish --changes

# Re-test in external repo
cd /path/to/external-repo
npm install --registry http://localhost:4873
```
