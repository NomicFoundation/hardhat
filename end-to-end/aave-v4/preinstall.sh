#!/usr/bin/env bash
set -euo pipefail

# Install Foundry so the benchmark's `forge` commands are available. The fuzz
# reduction below also rewrites foundry.toml, so foundry must be on PATH for
# the forge-based benchmark commands declared in scenario.json. E2E_TEST_DIR is
# set by scripts/end-to-end/subcommands/init.ts (see runPreinstallScript) to
# this scenario's directory, so we can reach the shared helper in _shared/.
. "$E2E_TEST_DIR/../_shared/foundry-install.sh"
install_foundry v1.7.1

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
# workload reduction.
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

// 2) foundry.toml — reduce [profile.default.fuzz] runs (the word boundary after
//    1000 keeps this off 'runs = 10000'/'runs = 5000' and 'optimizer_runs'), and
//    clamp any optimizer_runs above Foundry's u32 maximum. The aave-v4 fork sets
//    optimizer_runs = 444444444444, which Solidity (and so Hardhat) accept but
//    Foundry rejects ('optimizer_runs value 444444444444 exceeds maximum allowed
//    value of 4294967295'), making every forge command — including the benchmark
//    commands — fail until it is clamped. Clamping to the u32 max preserves the
//    'optimize as hard as possible' intent while letting forge parse the config.
const fdPath = 'foundry.toml';
let fdConfig = fs.readFileSync(fdPath, 'utf8');
const fdRe = /\bruns = 1000\b/;
if (!fdRe.test(fdConfig)) {
  console.error(
    'aave-v4 preinstall: expected \`runs = 1000\` not found in ' + fdPath +
      ' — the pinned commit may have changed. Refusing to run the benchmark ' +
      'against an unexpected fuzz workload.',
  );
  process.exit(1);
}
fdConfig = fdConfig.replace(fdRe, \`runs = \${fuzzRuns}\`);

const FOUNDRY_MAX_OPTIMIZER_RUNS = 4294967295;
let clampedOptimizerRuns = 0;
fdConfig = fdConfig.replace(/optimizer_runs = (\d+)/g, (match, value) => {
  if (Number(value) > FOUNDRY_MAX_OPTIMIZER_RUNS) {
    clampedOptimizerRuns++;
    return 'optimizer_runs = ' + FOUNDRY_MAX_OPTIMIZER_RUNS;
  }
  return match;
});
fs.writeFileSync(fdPath, fdConfig);

console.log(
  \`aave-v4 preinstall: reduced fuzz runs 1000 -> \${fuzzRuns} in \` +
    'hardhat.config.ts and foundry.toml, and clamped ' + clampedOptimizerRuns +
    ' over-u32 optimizer_runs value(s) in foundry.toml for benchmarking',
);
"
