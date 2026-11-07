#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"

# Pinned solx/forge versions shared by every solx scenario.
source "$MONOREPO_ROOT/scripts/benchmark/pinned-tool-versions.sh"

# The benchmark profiles pin solc 0.8.34 (the only version solx embeds), but
# the project's own sources pin `pragma solidity 0.8.30;`. Relax those exact
# pragmas to caret ranges so the same sources compile under 0.8.34. The
# repo's @1inch npm dependencies pin the same exact pragma, but node_modules
# only exists after the harness installs — the "relax dependency pragmas"
# prime step (relax-dep-pragmas.cjs, copied below) covers those.
node "$MONOREPO_ROOT/scripts/benchmark/relax-pragmas.ts" --scenario 1inch-swap-vm-solx --from 0.8.30 --skip-dir lib

# Declare the monorepo's hardhat-slang-solx and hardhat-slang as
# devDependencies at their workspace versions, which --use-local publishes to
# and resolves from Verdaccio, plus the freshness oracles in .solx — see
# scripts/benchmark/wire-hardhat-plugins.ts.
node "$MONOREPO_ROOT/scripts/benchmark/wire-hardhat-plugins.ts" --target-dir "$WORKDIR"

# Pinned solx for the version cells: the wrapper config's "solx-0.1.8"
# profiles point at this binary via the plugin's `path` option. The pinned
# cells are the shipped measurement (the plugin maps 0.8.34 to 0.1.8);
# 0.1.4, the map when this scenario was written, fails via-IR on this repo
# with a YulException that 0.1.7 fixes.
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version "$SOLX_PINNED_VERSION" --out "$WORKDIR/.solx/solx-v$SOLX_PINNED_VERSION"

# The slang compiler under test, for the wrapper config's "slang" profile
# (hardhat-slang's `path` option): the pinned release, or the local build
# named by HARDHAT_SLANG_BENCH_BINARY.
node "$MONOREPO_ROOT/scripts/benchmark/provision-slang.ts" --tag "$SLANG_PINNED_TAG" --asset-suffix "$SLANG_PINNED_ASSET_SUFFIX" --out "$WORKDIR/.solx/slang"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.)
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_PINNED_VERSION" --out "$WORKDIR/.foundry/forge"

# forge with the solar its release ships, for the forge-solar cell
# (FOUNDRY_SOLC pointed at that solar).
rm -rf "$WORKDIR/.foundry-solar"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_SOLAR_PINNED_VERSION" --with-solar --out "$WORKDIR/.foundry-solar/forge"

# Take TWAPSwapTest#test_TWAP_CumulativeSoldTracking_Multiple_Swaps out of
# test discovery for every compiler (rename: not test-prefixed => neither EDR
# nor forge runs it). It caches block.timestamp in a local and warps relative
# to it; solc via-IR re-reads TIMESTAMP after each vm.warp, so its warps
# compound, and the expected amounts only hold under that. slang keeps the
# local and warps where the source says, so the trade misses its minimum.
node -e '
const fs = require("fs");
const p = "test/TWAPSwap.t.sol";
let s = fs.readFileSync(p, "utf8");
const anchor = "function test_TWAP_CumulativeSoldTracking_Multiple_Swaps(";
if (s.split(anchor).length !== 2) {
  console.error("1inch-swap-vm preinstall: expected exactly one test_TWAP_CumulativeSoldTracking_Multiple_Swaps in " + p + " — the pinned commit may have changed");
  process.exit(1);
}
fs.writeFileSync(p, s.replace(anchor, "function skip_TWAP_CumulativeSoldTracking_Multiple_Swaps("));
console.log("1inch-swap-vm preinstall: renamed TWAPSwapTest#test_TWAP_CumulativeSoldTracking_Multiple_Swaps out of discovery");
'

# Prime-step helper for the @1inch dependency pragmas — see its header.
cp "$E2E_TEST_DIR/relax-dep-pragmas.cjs" "$WORKDIR/relax-dep-pragmas.cjs"

# Swap in the wrapper config that adds the solx build profiles. The original
# is kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. The shared profile factory is copied in beside it
# (the monorepo isn't importable from the checkout at hardhat runtime).
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
cp "$MONOREPO_ROOT/scripts/benchmark/solx-profiles.ts" solx-profiles.ts
