# Benchmark scripts

Tooling for the benchmark harness (`pnpm bench:*`) and the solx regression
benchmark. Scripts follow the conventions in [scripts/README.md](../README.md)
and print USAGE when run without arguments.

## Adding a solx benchmark scenario

A solx scenario is a directory `end-to-end/<project>-solx/` (identified by its
`hardhat.config.solx.ts` — openzeppelin-contracts-0.34 predates the naming)
that benchmarks a pinned real-world repo across the profile matrix {solc, shipped solx, pinned
solx} x {legacy, via-IR} (+ optimizer-off solc). It needs at least three
files (some scenarios vendor extras their preinstall copies in, e.g.
lidofinance-core-solx's `foundry.toml` or 1inch-swap-vm-solx's
`relax-dep-pragmas.cjs` prime-step helper); the machinery is shared, so each
file mostly composes helpers with parameters:

1. **`scenario.json`** — repo/commit pin, package manager, env, and the
   benchmark commands (copy a similar scenario's; keep the
   `assert fresh hardhat-slang-solx` prime step).
2. **`preinstall.sh`** — runs inside the cloned checkout with
   `E2E_TEST_DIR` pointing at the scenario dir. It composes:
   - `source scripts/benchmark/pinned-tool-versions.sh` — the solx/forge
     version pins (see that file for what it does NOT control);
   - `scripts/benchmark/relax-pragmas.ts` — only if the repo pins exact
     `pragma solidity x.y.z;` versions;
   - `scripts/benchmark/wire-hardhat-plugins.ts` — declares the monorepo's
     hardhat-slang-solx and hardhat-slang as devDependencies, which
     `--use-local` resolves from Verdaccio;
   - `scripts/benchmark/download-solx.ts` / `download-forge.ts` /
     `provision-slang.ts` — provision the pinned binaries;
   - the config swap: rename the repo's `hardhat.config.ts` to
     `hardhat.config.base.ts`, copy the scenario's `hardhat.config.solx.ts`
     in as `hardhat.config.ts`, and copy
     `scripts/benchmark/solx-profiles.ts` in beside it.
   Any repo-specific surgery (lockfile removal, package.json fixups) stays
   inline in the preinstall, with a fail-loud guard so pin drift is caught.
3. **`hardhat.config.solx.ts`** — a wrapper config that imports the repo's
   original config (`./hardhat.config.base.ts`) plus the copied-in factory
   (`./solx-profiles.ts`) and builds the profile map with
   `buildSolxProfiles({ baseSettings, ... })`. See the factory's header for
   the matrix and options (per-file `overrides`, `ballastCompilers`);
   aave-v4-solx shows per-file overrides, lidofinance-core-solx shows
   ballast trees.

Verify with `pnpm e2e init --scenario end-to-end/<scenario>` and a
`npx hardhat compile --build-profile <profile>` per cell in the resulting
working dir.

## Refreshing the slang baseline

Dispatch **Slang Regression Benchmark** on the branch, then copy its
`slang-baseline-report-merged` artifact over
`scripts/benchmark/slang-baseline-report.json` and commit it.

- The filters pick what gets refreshed: the defaults rerun every cell,
  `benchmark-filter: cold compile forge-*solar` only forge + solar,
  `cold compile slang*` only slang. Cells the run doesn't measure stay as
  they were.
- The dispatch's `Store benchmark result` step fails on the token policy;
  the merged artifact is still produced.
- PR runs measure only slang and solx-0.1.8 and borrow every other cell from
  the baseline. Each borrowed value's † links the run that measured it,
  which `merge-baseline-report.ts` records per cell.
