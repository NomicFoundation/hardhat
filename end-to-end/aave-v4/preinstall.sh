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
# Tune FUZZ_RUNS to trade benchmark cost against the fuzz volume exercised.
FUZZ_RUNS=100

# Use node for the file transform to avoid BSD/GNU sed portability issues
# (matches the convention used by the other scenarios' preinstall scripts).
node -e "
const fs = require('fs');
const path = 'hardhat.config.ts';
const fuzzRuns = ${FUZZ_RUNS};

let config = fs.readFileSync(path, 'utf8');

// Scope the replacement to the test.solidity.fuzz block so we never touch
// the (much larger) optimizer 'runs' values elsewhere in the config.
const re = /(\bfuzz:\s*\{[^}]*?\bruns:\s*)1000\b/;

if (!re.test(config)) {
  console.error(
    'aave-v4 preinstall: expected \`fuzz: { runs: 1000 }\` not found in ' +
      'hardhat.config.ts — the pinned commit may have changed. Refusing to ' +
      'run the benchmark against an unexpected fuzz workload.',
  );
  process.exit(1);
}

config = config.replace(re, \`\$1\${fuzzRuns}\`);
fs.writeFileSync(path, config);
console.log(
  \`aave-v4 preinstall: reduced Solidity test fuzz.runs 1000 -> \${fuzzRuns} for benchmarking\`,
);
"
