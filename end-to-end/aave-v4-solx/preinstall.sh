#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"
SOLX_PKG="$MONOREPO_ROOT/packages/hardhat-solx"

# The four benchmark profiles all pin solc 0.8.34 (the only version solx
# embeds), but the project's own sources pin `pragma solidity 0.8.28;`.
# Relax those exact pragmas to caret ranges so the same sources compile under
# 0.8.34. Submodules (lib/) are left untouched: their pragmas are already
# ranges, and editing them would break the harness's re-init submodule update.
# Use node for the file transforms to avoid BSD/GNU sed portability issues
# (matches the convention used by the other scenarios' preinstall scripts).
node -e "
const fs = require('fs');
const path = require('path');

const FROM = 'pragma solidity 0.8.28;';
const TO = 'pragma solidity ^0.8.28;';
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
    'aave-v4-solx preinstall: no \`' + FROM + '\` pragmas found — the pinned ' +
      'commit may have changed. Refusing to benchmark an unexpected source tree.',
  );
  process.exit(1);
}

console.log('aave-v4-solx preinstall: relaxed the pinned pragma in ' + patched + ' files');
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
mv "$WORKDIR/.solx/"nomicfoundation-hardhat-solx-*.tgz "$WORKDIR/.solx/hardhat-solx.tgz"

# `npm pkg set` only edits package.json (no lockfile involved), so it is safe
# under yarn too; the subsequent `yarn install` resolves the new file: entry.
npm pkg set "devDependencies.@nomicfoundation/hardhat-solx=file:./.solx/hardhat-solx.tgz"

# Swap in the wrapper config that adds the solx build profile. The original is
# kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts.
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
