# Scripts

Infrastructure scripts for CI, releases, and monorepo maintenance. They run directly under Node 24 using type stripping (no build step).

## npm scripts

To support the development and maintenance of `./scripts`, the following npm scripts are available:

<!-- prettier-ignore -->
| Script                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `pnpm test:scripts`     | Run all `*.test.ts` files                   |
| `pnpm lint:scripts`     | Check formatting (prettier) and types (tsc) |
| `pnpm lint:scripts:fix` | Fix formatting, then type-check             |
| `pnpm tsc:scripts`      | Type-check only (`tsc --noEmit`)            |
| `pnpm prettier:scripts` | Run prettier (pass `--check` or `--write`)  |

`pnpm lint` and `pnpm lint:fix` at the repo root include `lint:scripts` automatically.

## Scenario tooling layers

The scenario-related scripts are layered, from low-level to high-level; each layer may only import from the layers below it:

1. `end-to-end/` (`pnpm e2e`) — run a command on an e2e scenario.
2. `profiler/` (`pnpm profiler`, `pnpm profiler:flamegraph`) — run a single e2e command once, for one or more scenarios, while profiling it (system-wide via Linux perf, or JavaScript-level via the JS engine's `--cpu-prof` profiler).
3. `benchmark/` (`pnpm bench`, `pnpm bench:regression`) — run a command multiple times and report statistics; regression benchmarking runs a predefined harness of benchmark commands.

### Profiler artifacts and trade-offs

`pnpm profiler` writes several views of the same recording with different trade-offs (time-ordering, portability, size). Run `pnpm profiler` and `pnpm profiler:flamegraph` without arguments for the artifact list and how to choose between them.

## Writing new scripts

**Language and runtime** — Write scripts as `.ts` files. Node 24 strips the types at runtime, so there is no compile step. The `scripts/tsconfig.json` handles type-checking via `pnpm tsc:scripts`.

**folders** - For complex scripts, organize the script under a folder with helper files separated out around the core script that documents the top level logic.

**Tests** — Place test files next to the script they test with a `.test.ts` suffix (e.g. `build-release-descriptors.test.ts`). Test pure utility functions that don't require IO or external setup; a complex setup implies the test is not worth the maintenance.

**Shared helpers** — Reusable utilities live in `lib/` (e.g. `lib/packages.ts`, `lib/changesets.ts`) or alongside related scripts (e.g. `github-release/file-helpers.ts`).

**CLI interface** — Parse arguments from `process.argv` directly. A script should ideally support three modes:

- **bare run** (no args) — print usage/help
- **`--dry-run`** — preview what would happen without side effects
- **command or flag e.g. `--run`** — perform the actual operation

See `bump-peers.ts` for a full example of this pattern.
