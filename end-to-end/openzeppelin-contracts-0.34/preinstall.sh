#!/usr/bin/env bash
set -euo pipefail

# Fresh resolution against the (Verdaccio) registry, matching the sibling
# openzeppelin-contracts scenario.
rm -f package-lock.json

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
# Name the tarball by content hash: npm never re-reads a changed `file:`
# tarball when the spec and the packed version are unchanged (this froze
# aave's shipped plugin at a stale version map on the persistent runner), so
# a content change must change the spec. Hash via node for BSD/GNU portability.
TARBALL="$(echo "$WORKDIR/.solx/"nomicfoundation-hardhat-solx-*.tgz)"
TARBALL_HASH="$(node -e "
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
console.log(createHash('sha256').update(readFileSync(process.argv[1])).digest('hex').slice(0, 12));
" "$TARBALL")"
mv "$TARBALL" "$WORKDIR/.solx/hardhat-solx-$TARBALL_HASH.tgz"

npm pkg set "devDependencies.@nomicfoundation/hardhat-solx=file:./.solx/hardhat-solx-$TARBALL_HASH.tgz"

# Freshness oracle for the "assert fresh hardhat-solx" prime step: the
# installed plugin must match this monorepo build byte-for-byte.
cp -R "$SOLX_PKG/dist/src" "$WORKDIR/.solx/expected-dist-src"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.7" profiles point at this binary via the plugin's `path` option
# (the plain "solx" profiles keep measuring the version the plugin ships).
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version 0.1.7 --out "$WORKDIR/.solx/solx-v0.1.7"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.)
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version 1.7.1 --out "$WORKDIR/.foundry/forge"

# Swap in the wrapper config that adds the solx build profile. The original is
# kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts.
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
