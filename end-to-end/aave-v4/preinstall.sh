#!/usr/bin/env bash

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
# The benchmark runs via `npx hardhat test solidity`, which reads only
# hardhat.config.ts — but we mirror the change into foundry.toml so that a
# direct `forge test` (and anyone reading the clone) uses the same iteration
# count, keeping the two configs consistent.
#
# Tune FUZZ_RUNS to trade benchmark cost against the fuzz volume exercised.
FUZZ_RUNS=100

# Use node for the file transforms to avoid BSD/GNU sed portability issues
# (matches the convention used by the other scenarios' preinstall scripts).
node -e "
const fs = require('fs');
const fuzzRuns = ${FUZZ_RUNS};

// 1) hardhat.config.ts — test.solidity.fuzz.runs. Scope the replacement to the
//    fuzz block so we never touch the (much larger) optimizer 'runs' values.
const hhPath = 'hardhat.config.ts';
const hhConfig = fs.readFileSync(hhPath, 'utf8');
const hhRe = /(\bfuzz:\s*\{[^}]*?\bruns:\s*)1000\b/;
if (!hhRe.test(hhConfig)) {
  console.error(
    'aave-v4 preinstall: expected fuzz \`runs: 1000\` not found in ' + hhPath +
      ' — the pinned commit may have changed. Refusing to run the benchmark ' +
      'against an unexpected fuzz workload.',
  );
  process.exit(1);
}
fs.writeFileSync(hhPath, hhConfig.replace(hhRe, \`\$1\${fuzzRuns}\`));

// 2) foundry.toml — [profile.default.fuzz] runs. The word boundary after 1000
//    keeps this off 'runs = 10000'/'runs = 5000' and the 'optimizer_runs' values.
const fdPath = 'foundry.toml';
const fdConfig = fs.readFileSync(fdPath, 'utf8');
const fdRe = /\bruns = 1000\b/;
if (!fdRe.test(fdConfig)) {
  console.error(
    'aave-v4 preinstall: expected \`runs = 1000\` not found in ' + fdPath +
      ' — the pinned commit may have changed. Refusing to run the benchmark ' +
      'against an unexpected fuzz workload.',
  );
  process.exit(1);
}
fs.writeFileSync(fdPath, fdConfig.replace(fdRe, \`runs = \${fuzzRuns}\`));

console.log(
  \`aave-v4 preinstall: reduced fuzz runs 1000 -> \${fuzzRuns} in \` +
    'hardhat.config.ts and foundry.toml for benchmarking',
);
"
