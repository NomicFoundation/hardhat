#!/usr/bin/env bash
set -euo pipefail

# Reduce the Solidity-test fuzz workload for benchmarking.
#
# The "aave-v4 / test solidity" regression benchmark is the single most
# expensive entry: ~82 s/run, and its run-to-run time is dominated by
# wall-clock jitter on a large, *deterministic* fuzz workload (the fuzz seed
# is pinned, so inputs do not change between runs). That jitter gives it a
# ~10% coefficient of variation, which — at 82 s/run — makes a tight (5%/3%)
# regression alert limit cost over an hour of CI for this benchmark alone.
#
# Cutting the per-test fuzz iteration count slashes the per-run time (and
# therefore the cost of the many runs a tight limit needs) without changing
# what is exercised, since the seed stays pinned. This is a benchmark-only
# workload reduction: it produces a one-time step in the stored series for
# this entry (github-action-benchmark keys the series on the benchmark name,
# so the history continues — it is not a new series).
#
# Tune FUZZ_RUNS to trade benchmark cost against the fuzz volume exercised.
FUZZ_RUNS=100

CONFIG="hardhat.config.ts"

# `runs: 1000,` is the test.solidity.fuzz iteration count and the only match in
# the config — the optimizer `runs` values are far larger (e.g. 444_444_444_444),
# so this targeted replacement never touches them. Assert the marker is present
# so a future pinned-commit bump can't silently mismeasure against an unexpected
# fuzz workload. Uses GNU sed (the benchmark runs on a Linux runner).
if ! grep -q 'runs: 1000,' "$CONFIG"; then
  echo "aave-v4 preinstall: expected 'runs: 1000,' (fuzz.runs) not found in $CONFIG — the pinned commit may have changed. Refusing to run the benchmark against an unexpected fuzz workload." >&2
  exit 1
fi

sed -i "s/runs: 1000,/runs: ${FUZZ_RUNS},/" "$CONFIG"
echo "aave-v4 preinstall: reduced Solidity test fuzz.runs 1000 -> ${FUZZ_RUNS} for benchmarking"
