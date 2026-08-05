#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"
SOLX_PKG="$MONOREPO_ROOT/packages/hardhat-solx"

# The benchmark profiles pin solc 0.8.34 (the only version solx embeds), but
# the project's own sources pin `pragma solidity 0.8.30;`. Relax those exact
# pragmas to caret ranges so the same sources compile under 0.8.34. The
# repo's @1inch npm dependencies pin the same exact pragma, but node_modules
# only exists after the harness installs — the "relax dependency pragmas"
# prime step (relax-dep-pragmas.cjs, copied below) covers those.
node -e "
const fs = require('fs');
const path = require('path');

const FROM = 'pragma solidity 0.8.30;';
const TO = 'pragma solidity ^0.8.30;';
const SKIP_DIRS = new Set(['node_modules', 'lib', '.git']);

let patched = 0;

(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(entryPath);
      }
    } else if (entry.name.endsWith('.sol')) {
      const source = fs.readFileSync(entryPath, 'utf8');
      if (source.includes(FROM)) {
        fs.writeFileSync(entryPath, source.replaceAll(FROM, TO));
        patched++;
      }
    }
  }
})('.');

if (patched === 0) {
  console.error(
    '1inch-swap-vm-solx preinstall: no \`' + FROM + '\` pragmas found — the pinned ' +
      'commit may have changed. Refusing to benchmark an unexpected source tree.',
  );
  process.exit(1);
}

console.log('1inch-swap-vm-solx preinstall: relaxed the pinned pragma in ' + patched + ' files');
"

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

# Pinned solx for the version cells: the wrapper config's "solx-0.1.7"
# profiles point at this binary via the plugin's `path` option. The pinned
# cells are the shipped measurement (the plugin maps 0.8.34 to 0.1.7);
# 0.1.4, the map when this scenario was written, fails via-IR on this repo
# with a YulException that 0.1.7 fixes.
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version 0.1.7 --out "$WORKDIR/.solx/solx-v0.1.7"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.)
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version 1.7.1 --out "$WORKDIR/.foundry/forge"

# Prime-step helper for the @1inch dependency pragmas — see its header.
cp "$E2E_TEST_DIR/relax-dep-pragmas.cjs" "$WORKDIR/relax-dep-pragmas.cjs"

# Swap in the wrapper config that adds the solx build profile. The original is
# kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts.
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
