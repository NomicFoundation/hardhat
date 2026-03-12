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
