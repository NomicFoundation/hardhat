#!/usr/bin/env bash
set -euo pipefail

# No source patches needed: every pragma in the tree is already a caret range
# that admits the 0.8.34 the benchmark profiles pin.

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"
SOLX_PKG="$MONOREPO_ROOT/packages/hardhat-solx"

# hardhat-solx is `private` and excluded from the Verdaccio publish set, so it
# never reaches the registry. Pack it instead (pack ignores `private`) and
# consume the tarball as a file: dependency. `pnpm pack` — not `npm pack` —
# rewrites the plugin's `workspace:` deps to real version ranges, so its own
# dependencies (hardhat-errors/utils/zod-utils, peer hardhat) still resolve
# from the registry like every other scenario dependency.
if [ ! -d "$SOLX_PKG/dist/src" ]; then
  echo "hardhat-solx dist not found at $SOLX_PKG/dist/src — run 'pnpm build' before benchmarking." >&2
  exit 1
fi

# Start from an empty .solx so the glob below can only match the tarball we
# just produced (a stale one from a prior run would make `mv` fail).
rm -rf "$WORKDIR/.solx"
mkdir -p "$WORKDIR/.solx"
(cd "$SOLX_PKG" && pnpm pack --pack-destination "$WORKDIR/.solx")
mv "$WORKDIR/.solx/"nomicfoundation-hardhat-solx-*.tgz "$WORKDIR/.solx/hardhat-solx.tgz"

# `npm pkg set` only edits package.json (no lockfile involved). The scenario's
# env sets pnpm_config_frozen_lockfile=false so CI's `pnpm install` (frozen by
# default under CI=true) may resolve this new entry into the lockfile.
npm pkg set "devDependencies.@nomicfoundation/hardhat-solx=file:./.solx/hardhat-solx.tgz"

# Swap in the wrapper config that adds the solx build profile. The original is
# kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts.
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
