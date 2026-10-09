#!/usr/bin/env bash
set -euo pipefail

# Fresh resolution against the (Verdaccio) registry, matching the sibling
# openzeppelin-contracts scenario.
rm -f package-lock.json

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"

# Pinned solx/forge versions shared by every solx scenario.
source "$MONOREPO_ROOT/scripts/benchmark/pinned-tool-versions.sh"

# Pack the monorepo's hardhat-slang-solx (private, never published to Verdaccio)
# into ./.solx and wire it in as a content-hash-named file: devDependency,
# plus the freshness oracle at .solx/expected-dist-src — see
# scripts/benchmark/pack-hardhat-solx.ts for the how and why.
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

# The fork's HH3 conversion has draft-ERC7579Utils.t.sol read
# hardhat-predeploy's bytecode out of node_modules; its hardhat config grants
# that read (solidityTest.fsPermissions) but foundry.toml predates the move,
# so `forge test` fails the suite on vm.readFileBinary. Mirror the project's
# own permission so both tools run the same suite. foundry.toml is a single
# [profile.default] table, so appending lands the key in it.
printf '\nfs_permissions = [{ access = "read", path = "node_modules/hardhat-predeploy/bin" }]\n' >> foundry.toml

# Take BlockhashTest#testFuzzHistoryBlocks out of test discovery, identically
# for all three toolchains (rename: not test-prefixed => neither EDR nor forge
# runs or counts it). It is an upstream test bug that only surfaces under solc
# via-IR with the optimizer on: _setHistoryBlockhash caches block.number across
# an inner vm.roll, and the Yul optimizer legitimately re-reads NUMBER after the
# roll (block.number is constant within a transaction; forge-std documents
# vm.getBlockNumber() for exactly this, foundry-rs/foundry#6180), so the restore
# roll lands on targetBlock+1 and the library takes the native BLOCKHASH branch.
# forge --via-ir fails it the same way; solc legacy and solx pass only because
# they keep the source evaluation order. Root cause and repro:
# /workspace/oz-blockhash-viair-root-cause.md. Fail loudly if the anchor moved.
node -e '
const fs = require("fs");
const p = "test/utils/Blockhash.t.sol";
let s = fs.readFileSync(p, "utf8");
const anchor = "function testFuzzHistoryBlocks(";
if (s.split(anchor).length !== 2) {
  console.error("openzeppelin preinstall: expected exactly one testFuzzHistoryBlocks in " + p + " — the pinned commit may have changed");
  process.exit(1);
}
fs.writeFileSync(p, s.replace(anchor, "function skipFuzzHistoryBlocks("));
console.log("openzeppelin preinstall: renamed BlockhashTest#testFuzzHistoryBlocks out of discovery");
'

# Patch the fork's own hardhat-exposed plugin to pass the active build profile
# to getCompilationJobs. Without it the task resolves jobs for the `default`
# profile, whose build-info Hardhat deletes whenever another profile is active,
# so under every non-default profile (all solx cells, solc via-IR) it misses
# the cache and re-runs an AST-only solc compile of all 666 sources plus a
# rewrite of the 286 exposed files on every invocation: ~2.8s per run,
# charged to those cells only (the plain solc cell is the default profile).
# Measured: OZ warm compile 3.9s solx vs 1.1s solc on the runner; a plain
# solc profile with runs=201 shows the same penalty, so this is the fork's
# plugin, not solx. One-line upstream fix, applied here until the fork
# re-pins (see /workspace/hardhat-solx-footnote-research.md). Fail loudly if
# the anchor moved.
node -e '
const fs = require("fs");
const p = "hardhat/hardhat-exposed/tasks/generate-exposed-contracts.ts";
let s = fs.readFileSync(p, "utf8");
const anchor = "hre.solidity.getCompilationJobs(rootPathsToExpose, { force: args.force })";
if (s.split(anchor).length !== 2) {
  console.error("openzeppelin preinstall: expected exactly one getCompilationJobs call in " + p + " — the pinned commit may have changed");
  process.exit(1);
}
fs.writeFileSync(p, s.replace(anchor, "hre.solidity.getCompilationJobs(rootPathsToExpose, { force: args.force, buildProfile: hre.globalOptions.buildProfile })"));
console.log("openzeppelin preinstall: hardhat-exposed now passes the active build profile to getCompilationJobs");
'
