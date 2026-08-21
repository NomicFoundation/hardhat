#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"

# Pinned solx/forge versions shared by every solx scenario.
source "$MONOREPO_ROOT/scripts/benchmark/pinned-tool-versions.sh"

# The benchmark moves everything upstream compiles at 0.8.25 to solc 0.8.34
# (the only version solx embeds), but those sources pin
# `pragma solidity 0.8.25;` exactly. Relax the exact pragmas to caret ranges so
# they compile under 0.8.34. The walker covers every such file except
# contracts/upgrade, which stays pinned at 0.8.25 on purpose: solc 0.8.26+
# cannot build UpgradeVoteScript.sol via-IR, so the wrapper config keeps that
# tree on upstream's own 0.8.25 compiler in every cell (see
# hardhat.config.solx.ts), and the exact pragma is what routes it there.
# test/ gets relaxed too and stays out of every cell regardless (--no-tests,
# plus the wrapper's source roots). The transitive imports (contracts/common,
# vendored + npm OpenZeppelin) already carry range pragmas and need no
# patching. Unlike aave, lib/ must NOT be skipped: the repo has no
# submodules, and contracts/0.8.25/vaults/lib holds first-party sources
# whose exact pragmas need relaxing too.
node "$MONOREPO_ROOT/scripts/benchmark/relax-pragmas.ts" --scenario lidofinance-core-solx --from 0.8.25 --skip-path contracts/upgrade

# Same package.json fixups as the non-solx lidofinance-core scenario (which
# shares this repo pin). Use node for the transforms to avoid BSD/GNU sed
# portability issues.
node -e "
const fs = require('fs');

// Allow Verdaccio-published hardhat to satisfy the dependency: the pin
// declares an exact hardhat version that the locally published bump would
// not satisfy.
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies ??= {};
pkg.devDependencies.hardhat = '^3.9.0';

// Pin ethers tree-wide to the repo's exact version. The lockfile removal below
// otherwise gives hardhat-ethers (ethers: ^6.14.0) a newer nested copy than the
// repo's pin, and two ethers classes break the test helpers' \`instanceof
// EventLog\` checks (findEvents in lib/event.ts finds no events).
const ethersVersion = pkg.dependencies?.ethers ?? pkg.devDependencies?.ethers;
if (ethersVersion === undefined) {
  console.error(
    'lidofinance-core-solx preinstall: expected an ethers pin in package.json — ' +
      'the pinned commit may have changed. Refusing to run without a ' +
      'tree-wide ethers resolution.',
  );
  process.exit(1);
}
pkg.resolutions = { ...pkg.resolutions, ethers: ethersVersion };

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Remove lockfile so yarn resolves the latest from Verdaccio instead of the pinned version
rm -f yarn.lock

# Pack the monorepo's hardhat-solx (private, never published to Verdaccio)
# into ./.solx and wire it in as a content-hash-named file: devDependency,
# plus the freshness oracle at .solx/expected-dist-src — see
# scripts/benchmark/pack-hardhat-solx.ts for the how and why. The package.json
# edit is safe under yarn too; the subsequent `yarn install` resolves the new
# file: entry.
node "$MONOREPO_ROOT/scripts/benchmark/pack-hardhat-solx.ts" --target-dir "$WORKDIR"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.8" profiles point at this binary via the plugin's `path` option.
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version "$SOLX_PINNED_VERSION" --out "$WORKDIR/.solx/solx-v$SOLX_PINNED_VERSION"

# The Hardhat 3 migration removed the repo's foundry.toml; reinstate the
# pre-migration one (vendored from NomicFoundation/lido-core@242beb163) so
# the forge cells compile with upstream's own per-tree settings — its
# compilation_restrictions mirror hardhat.config.ts, including the 0.8.25
# tree's via-IR/cancun, plus the benchmark's own 0.8.34 version cap (see the
# file's header). remappings.txt survives at the pin and resolves
# forge-std from npm, so the removed foundry/lib submodule isn't needed for
# builds. Fail loudly if the pin ships its own foundry.toml again.
if [ -e foundry.toml ]; then
  echo "lidofinance-core-solx preinstall: the pinned commit ships a foundry.toml — the pin may have changed; refusing to overwrite it." >&2
  exit 1
fi
cp "$E2E_TEST_DIR/foundry.toml" foundry.toml

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so the vendored
# foundry.toml's per-tree compilation_restrictions are enough to put every tree
# on the same compiler and settings as the hardhat cells. No FOUNDRY_SOLC
# override: one global version can't serve trees that predate it.
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_PINNED_VERSION" --out "$WORKDIR/.foundry/forge"

# Swap in the wrapper config that adds the solx build profiles. The original
# is kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. The shared profile factory is copied in beside it
# (the monorepo isn't importable from the checkout at hardhat runtime).
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
cp "$MONOREPO_ROOT/scripts/benchmark/solx-profiles.ts" solx-profiles.ts
