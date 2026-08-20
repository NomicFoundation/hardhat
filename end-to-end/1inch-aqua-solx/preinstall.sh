#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"

# Pinned solx/forge versions shared by every solx scenario.
source "$MONOREPO_ROOT/scripts/benchmark/pinned-tool-versions.sh"

# The benchmark profiles pin solc 0.8.34 (the only version solx embeds), but
# a handful of the project's sources pin `pragma solidity 0.8.30;`. Relax
# those exact pragmas to caret ranges so the same sources compile under
# 0.8.34. The @1inch dependencies here already use caret ranges (unlike the
# 1inch-swap-vm-solx scenario), so node_modules needs no treatment. The
# repo's patch-package postinstall (fixing @1inch/solidity-utils' exports
# field for Hardhat) runs as part of the normal install.
node "$MONOREPO_ROOT/scripts/benchmark/relax-pragmas.ts" --scenario 1inch-aqua-solx --from 0.8.30 --skip-dir lib

# Pack the monorepo's hardhat-solx (private, never published to Verdaccio)
# into ./.solx and wire it in as a content-hash-named file: devDependency,
# plus the freshness oracle at .solx/expected-dist-src — see
# scripts/benchmark/pack-hardhat-solx.ts for the how and why. The package.json
# edit is safe under yarn too; the subsequent `yarn install` resolves the new
# file: entry.
node "$MONOREPO_ROOT/scripts/benchmark/pack-hardhat-solx.ts" --target-dir "$WORKDIR"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.7" profiles point at this binary via the plugin's `path` option
# (the plain "solx" profiles keep measuring the version the plugin ships).
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version "$SOLX_PINNED_VERSION" --out "$WORKDIR/.solx/solx-v$SOLX_PINNED_VERSION"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.) Neither side pins evmVersion:
# forge 1.7.1 and Hardhat both default solc 0.8.34 to osaka.
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_PINNED_VERSION" --out "$WORKDIR/.foundry/forge"

# Swap in the wrapper config that adds the solx build profiles. The original
# is kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. The shared profile factory is copied in beside it
# (the monorepo isn't importable from the checkout at hardhat runtime).
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
cp "$MONOREPO_ROOT/scripts/benchmark/solx-profiles.ts" solx-profiles.ts
