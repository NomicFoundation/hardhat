#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"

# Pinned solx/forge versions shared by every solx scenario.
source "$MONOREPO_ROOT/scripts/benchmark/pinned-tool-versions.sh"

# The four benchmark profiles all pin solc 0.8.34 (the only version solx
# embeds), but the project's own sources pin `pragma solidity 0.8.28;`.
# Relax those exact pragmas to caret ranges so the same sources compile under
# 0.8.34. Submodules (lib/) are left untouched: their pragmas are already
# ranges, and editing them would break the harness's re-init submodule update.
node "$MONOREPO_ROOT/scripts/benchmark/relax-pragmas.ts" --scenario aave-v4-solx --from 0.8.28 --skip-dir lib

# Pack the monorepo's hardhat-slang-solx (private, never published to Verdaccio)
# into ./.solx and wire it in as a content-hash-named file: devDependency,
# plus the freshness oracle at .solx/expected-dist-src — see
# scripts/benchmark/pack-hardhat-solx.ts for the how and why. The package.json
# edit is safe under yarn too; the subsequent `yarn install` resolves the new
# file: entry.
node "$MONOREPO_ROOT/scripts/benchmark/pack-hardhat-solx.ts" --target-dir "$WORKDIR"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.8" profiles point at this binary via the plugin's `path` option
# (the plain "solx" profiles keep measuring the version the plugin ships).
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version "$SOLX_PINNED_VERSION" --out "$WORKDIR/.solx/solx-v$SOLX_PINNED_VERSION"

# forge 1.7.1 rejects the pinned commit's `optimizer_runs = 444444444444`
# (foundry-rs/foundry#14354 caps it at u32::MAX). Apply upstream's own fix,
# aave/aave-v4@dd26d09547 (#1280), which shrank every occurrence to 44444444 —
# both values saturate the size-vs-gas tradeoff. The hardhat cells keep the
# fork's shipped 444_444_444_444. Use node for the file transform to avoid
# BSD/GNU sed portability issues.
node -e "
const fs = require('fs');
const toml = fs.readFileSync('foundry.toml', 'utf8');
if (!toml.includes('444444444444')) {
  console.error('aave-v4-solx preinstall: no 444444444444 optimizer_runs in foundry.toml — the pinned commit may have changed.');
  process.exit(1);
}
fs.writeFileSync('foundry.toml', toml.replaceAll('444444444444', '44444444'));
"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION: with an [etherscan] table present, forge misparses
# the latter into etherscan.solc and dies.)
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_PINNED_VERSION" --out "$WORKDIR/.foundry/forge"

# Swap in the wrapper config that adds the solx build profiles. The original
# is kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. The shared profile factory is copied in beside it
# (the monorepo isn't importable from the checkout at hardhat runtime).
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
cp "$MONOREPO_ROOT/scripts/benchmark/solx-profiles.ts" solx-profiles.ts
