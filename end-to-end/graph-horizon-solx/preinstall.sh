#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
HORIZON="$WORKDIR/packages/horizon"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"
SOLX_PKG="$MONOREPO_ROOT/packages/hardhat-solx"

# The repo pins `engines: { pnpm: "^10.28" }` and pnpm enforces engines.pnpm
# unconditionally (engine-strict only gates engines.node), so the harness's
# pnpm 11 would refuse to install. Drop the pin; fail loudly if it isn't the
# expected one so pin drift is caught. Use node for the file transforms to
# avoid BSD/GNU sed portability issues (matches the other scenarios'
# preinstall scripts).
node -e "
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.engines?.pnpm === undefined || !pkg.engines.pnpm.startsWith('^10')) {
  console.error(
    'graph-horizon-solx preinstall: expected engines.pnpm ^10.x in the root ' +
      'package.json — the pinned commit may have changed.',
  );
  process.exit(1);
}
delete pkg.engines.pnpm;

// The rocketh patches pin exact versions that only the lockfile guarantees;
// after the lockfile removal below their caret-ranged consumers
// (packages/deployment, benchmark-irrelevant deploy tooling) resolve past
// them and pnpm hard-errors with ERR_PNPM_UNUSED_PATCH. Drop the two
// entries; the typechain patch targets an exactly-pinned version and stays.
const patches = pkg.pnpm?.patchedDependencies ?? {};
const rockethPatches = Object.keys(patches).filter((name) =>
  name.startsWith('rocketh@') || name.startsWith('@rocketh/'),
);
if (rockethPatches.length === 0) {
  console.error(
    'graph-horizon-solx preinstall: no rocketh patchedDependencies in the ' +
      'root package.json — the pinned commit may have changed.',
  );
  process.exit(1);
}
for (const name of rockethPatches) {
  delete patches[name];
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# The workspace manifest sets minimumReleaseAge: 7200, which would reject the
# minutes-old packages this run just published to Verdaccio if it ever takes
# precedence over the harness's pnpm_config_minimum_release_age=0 env.
# Belt-and-braces: strip the setting (and its typo'd exclude list) at the
# text level; fail loudly if it's gone so pin drift is caught.
node -e "
const fs = require('fs');

const manifest = fs.readFileSync('pnpm-workspace.yaml', 'utf8');
if (!manifest.includes('minimumReleaseAge')) {
  console.error(
    'graph-horizon-solx preinstall: no minimumReleaseAge in ' +
      'pnpm-workspace.yaml — the pinned commit may have changed.',
  );
  process.exit(1);
}
// Drop each min[iu]mumReleaseAge* top-level key together with its indented
// block (the exclude key holds a list; leaving orphaned list items behind
// would break the YAML).
const lines = manifest.split('\n');
const stripped = [];
let inStrippedBlock = false;
for (const line of lines) {
  if (/^min[iu]mumReleaseAge/.test(line)) {
    inStrippedBlock = true;
    continue;
  }
  if (inStrippedBlock && /^\s+\S/.test(line)) {
    continue;
  }
  inStrippedBlock = false;
  stripped.push(line);
}
fs.writeFileSync('pnpm-workspace.yaml', stripped.join('\n'));
"

# Remove the lockfile: it pins the npmjs hardhat release, which satisfies
# horizon's `hardhat: ^3.11.0` range, so pnpm would keep it and the run would
# benchmark the released hardhat instead of the Verdaccio build published by
# this run (--use-local's dependency bump only inspects the repo-root
# package.json, which has no hardhat dependency in this monorepo). Deleting
# forces a full re-resolution against Verdaccio; the range admits the bumped
# local version, so no further patching is needed.
rm -f pnpm-lock.yaml

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
# just produced (a stale one from a prior run would make `mv` fail). The
# plugin bits live under packages/horizon — the workspace package that
# consumes them — not the repo root.
rm -rf "$HORIZON/.solx"
mkdir -p "$HORIZON/.solx"
(cd "$SOLX_PKG" && pnpm pack --pack-destination "$HORIZON/.solx")
# Name the tarball by content hash: npm never re-reads a changed `file:`
# tarball when the spec and the packed version are unchanged (this froze
# aave's shipped plugin at a stale version map on the persistent runner), so
# a content change must change the spec. Hash via node for BSD/GNU portability.
TARBALL="$(echo "$HORIZON/.solx/"nomicfoundation-hardhat-solx-*.tgz)"
TARBALL_HASH="$(node -e "
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
console.log(createHash('sha256').update(readFileSync(process.argv[1])).digest('hex').slice(0, 12));
" "$TARBALL")"
mv "$TARBALL" "$HORIZON/.solx/hardhat-solx-$TARBALL_HASH.tgz"

# `npm pkg set` only edits package.json (no lockfile involved). Run it inside
# packages/horizon — not via --prefix — so the file: spec stays relative to
# the declaring package, which is how pnpm resolves file: deps in a workspace.
(cd "$HORIZON" && npm pkg set "devDependencies.@nomicfoundation/hardhat-solx=file:./.solx/hardhat-solx-$TARBALL_HASH.tgz")

# Freshness oracle for the "assert fresh hardhat-solx" prime step: the
# installed plugin must match this monorepo build byte-for-byte.
cp -R "$SOLX_PKG/dist/src" "$HORIZON/.solx/expected-dist-src"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.7" profiles point at this binary via the plugin's `path` option.
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version 0.1.7 --out "$HORIZON/.solx/solx-v0.1.7"

# The Hardhat 3 migration stack reduced foundry.toml to a lint-only config;
# reinstate the pre-migration one (vendored from PR #1's 8d148f39, which the
# migration replaced) so the forge cells compile with upstream's own
# settings — its [profile.prod] (optimizer runs 100, via-IR) matches the
# hardhat cells' production-derived settings. Fail loudly if the shape
# changes under the pin.
if ! grep -q "lint_on_build" "$HORIZON/foundry.toml"; then
  echo "graph-horizon-solx preinstall: packages/horizon/foundry.toml is not the expected lint-oriented config — the pinned commit may have changed." >&2
  exit 1
fi
cp "$E2E_TEST_DIR/foundry.toml" "$HORIZON/foundry.toml"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.)
rm -rf "$HORIZON/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version 1.7.1 --out "$HORIZON/.foundry/forge"

# Swap in the wrapper config that adds the solx build profile. The original is
# kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. Both live in packages/horizon.
mv "$HORIZON/hardhat.config.ts" "$HORIZON/hardhat.config.base.ts"
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" "$HORIZON/hardhat.config.ts"
