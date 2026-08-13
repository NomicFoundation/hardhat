#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"
SOLX_PKG="$MONOREPO_ROOT/packages/hardhat-solx"

# The benchmark profiles all pin solc 0.8.34 (the only version solx embeds),
# but the modern vaults tree pins `pragma solidity 0.8.25;` exactly. Relax
# those exact pragmas to caret ranges so the same sources compile under
# 0.8.34. The walker also touches exact-0.8.25 files outside contracts/0.8.25
# (tooling, upgrade helpers, tests) — harmless, the wrapper config's scoped
# sources and --no-tests keep them out of every cell. The transitive imports
# (contracts/common, vendored + npm OpenZeppelin) already carry range pragmas
# and need no patching. Use node for the file transforms to avoid BSD/GNU sed
# portability issues (matches the convention used by the other scenarios'
# preinstall scripts).
node -e "
const fs = require('fs');
const path = require('path');

const FROM = 'pragma solidity 0.8.25;';
const TO = 'pragma solidity ^0.8.25;';
// Unlike aave's walker this one must NOT skip 'lib': the repo has no
// submodules, and contracts/0.8.25/vaults/lib holds first-party sources
// whose exact pragmas need relaxing too.
const SKIP_DIRS = new Set(['node_modules', '.git']);

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
    'lidofinance-core-solx preinstall: no \`' + FROM + '\` pragmas found — ' +
      'the pinned commit may have changed. Refusing to benchmark an ' +
      'unexpected source tree.',
  );
  process.exit(1);
}

console.log('lidofinance-core-solx preinstall: relaxed the pinned pragma in ' + patched + ' files');
"

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

# `npm pkg set` only edits package.json (no lockfile involved), so it is safe
# under yarn too; the subsequent `yarn install` resolves the new file: entry.
npm pkg set "devDependencies.@nomicfoundation/hardhat-solx=file:./.solx/hardhat-solx-$TARBALL_HASH.tgz"

# Freshness oracle for the "assert fresh hardhat-solx" prime step: the
# installed plugin must match this monorepo build byte-for-byte.
cp -R "$SOLX_PKG/dist/src" "$WORKDIR/.solx/expected-dist-src"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.7" profiles point at this binary via the plugin's `path` option.
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version 0.1.7 --out "$WORKDIR/.solx/solx-v0.1.7"

# The Hardhat 3 migration removed the repo's foundry.toml; reinstate the
# pre-migration one (vendored from NomicFoundation/lido-core@242beb163) so
# the forge cells compile with upstream's own per-tree settings — its
# compilation_restrictions mirror hardhat.config.ts, including the 0.8.25
# tree's via-IR/cancun. remappings.txt survives at the pin and resolves
# forge-std from npm, so the removed foundry/lib submodule isn't needed for
# builds. Fail loudly if the pin ships its own foundry.toml again.
if [ -e foundry.toml ]; then
  echo "lidofinance-core-solx preinstall: the pinned commit ships a foundry.toml — the pin may have changed; refusing to overwrite it." >&2
  exit 1
fi
cp "$E2E_TEST_DIR/foundry.toml" foundry.toml

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
