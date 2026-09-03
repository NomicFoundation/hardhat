#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"

# Pinned solx/forge versions shared by every solx scenario.
source "$MONOREPO_ROOT/scripts/benchmark/pinned-tool-versions.sh"

# The four benchmark profiles all pin solc 0.8.34 (the only version solx
# embeds), but src/PoolManager.sol pins `pragma solidity 0.8.26;` (the only
# exact pragma in the tree). Relax it to a caret range so the same sources
# compile under 0.8.34. The generic sweep stays robust if more files gain
# the pinned pragma; submodules (lib/) are left untouched.
node "$MONOREPO_ROOT/scripts/benchmark/relax-pragmas.ts" --scenario uniswap-v4-core-solx --from 0.8.26 --skip-dir lib

# Pack the monorepo's hardhat-slang-solx (private, never published to Verdaccio)
# into ./.solx and wire it in as a content-hash-named file: devDependency,
# plus the freshness oracle at .solx/expected-dist-src — see
# scripts/benchmark/pack-hardhat-solx.ts for the how and why. The scenario's
# env sets pnpm_config_frozen_lockfile=false so CI's `pnpm install` (frozen by
# default under CI=true) may resolve the new package.json entry into the
# lockfile.
node "$MONOREPO_ROOT/scripts/benchmark/pack-hardhat-solx.ts" --target-dir "$WORKDIR"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.8" profiles point at this binary via the plugin's `path` option
# (the plain "solx" profiles keep measuring the version the plugin ships).
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version "$SOLX_PINNED_VERSION" --out "$WORKDIR/.solx/solx-v$SOLX_PINNED_VERSION"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.)
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_PINNED_VERSION" --out "$WORKDIR/.foundry/forge"

# Swap in the wrapper config that adds the solx build profiles. The original
# is kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. The shared profile factory is copied in beside it
# (the monorepo isn't importable from the checkout at hardhat runtime).
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
cp "$MONOREPO_ROOT/scripts/benchmark/solx-profiles.ts" solx-profiles.ts

# Take TickMathTestTest#test_fuzz_getTickAtSqrtPrice_getSqrtPriceAtTick_relation
# out of test discovery, identically for all three toolchains (rename: not
# test-prefixed => neither EDR nor forge runs or counts it). Upstream test bug,
# still present on Uniswap/v4-core main: the bound admits tick = MAX_TICK - 1,
# for which priceAtNextTick = getSqrtPriceAtTick(MAX_TICK) = MAX_SQRT_PRICE, and
# the last assertion calls getTickAtSqrtPrice(MAX_SQRT_PRICE), which reverts
# InvalidSqrtPrice by definition (valid input is < MAX_SQRT_PRICE). Whether a
# run hits it depends only on the fuzzer drawing that one tick: upstream's seed
# on via-IR bytecode never does, EDR's fuzzer never did, and forge's legacy
# build did (run 33779273436) — its fuzz dictionary is sampled from the
# bytecode, which differs per pipeline. Not a compiler or tool divergence.
# Fail loudly if the anchor moved.
node -e '
const fs = require("fs");
const p = "test/libraries/TickMath.t.sol";
let s = fs.readFileSync(p, "utf8");
const anchor = "function test_fuzz_getTickAtSqrtPrice_getSqrtPriceAtTick_relation(";
if (s.split(anchor).length !== 2) {
  console.error("uniswap preinstall: expected exactly one test_fuzz_getTickAtSqrtPrice_getSqrtPriceAtTick_relation in " + p + " — the pinned commit may have changed");
  process.exit(1);
}
fs.writeFileSync(p, s.replace(anchor, "function skip_fuzz_getTickAtSqrtPrice_getSqrtPriceAtTick_relation("));
console.log("uniswap preinstall: renamed TickMathTestTest#test_fuzz_getTickAtSqrtPrice_getSqrtPriceAtTick_relation out of discovery");
'
