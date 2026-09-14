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

# Pack the monorepo's hardhat-slang-solx (private, never published to Verdaccio)
# into ./.solx and wire it in as a content-hash-named file: devDependency,
# plus the freshness oracle at .solx/expected-dist-src — see
# scripts/benchmark/pack-hardhat-solx.ts for the how and why.
node "$MONOREPO_ROOT/scripts/benchmark/pack-hardhat-solx.ts" --target-dir "$WORKDIR"

# Pinned solx for the version cells: the wrapper config's "solx-0.1.8"
# profiles point at this binary via the plugin's `path` option. The pinned
# cells are the shipped measurement (the plugin maps 0.8.34 to 0.1.8);
# 0.1.4, the map when this scenario was written, fails via-IR on this repo
# with a YulException that 0.1.7 fixes.
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version "$SOLX_PINNED_VERSION" --out "$WORKDIR/.solx/solx-v$SOLX_PINNED_VERSION"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.)
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_PINNED_VERSION" --out "$WORKDIR/.foundry/forge"

# Prime-step helper for the @1inch dependency pragmas — see its header.
cp "$E2E_TEST_DIR/relax-dep-pragmas.cjs" "$WORKDIR/relax-dep-pragmas.cjs"

# Swap in the wrapper config that adds the solx build profiles. The original
# is kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. The shared profile factory is copied in beside it
# (the monorepo isn't importable from the checkout at hardhat runtime).
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
cp "$MONOREPO_ROOT/scripts/benchmark/solx-profiles.ts" solx-profiles.ts
