#!/usr/bin/env bash
set -euo pipefail

# Fresh resolution against the (Verdaccio) registry, matching the
# openzeppelin-contracts-0.34 scenario.
rm -f package-lock.json

WORKDIR="$PWD"
MONOREPO_ROOT="$(cd "$E2E_TEST_DIR/../.." && pwd)"

# Pinned solx/forge versions shared by every solx scenario.
source "$MONOREPO_ROOT/scripts/benchmark/pinned-tool-versions.sh"

# Scope parity with forge: the benchmark mirrors upstream's [profile.post_osaka]
# CI profile, whose `skip = ["*/ext/ithaca/*"]` forge honors natively while
# Hardhat has no skip equivalent. Remove exactly those files so both tools
# compile the identical 246-source set (verified: nothing else imports them).
ITHACA_FILES=(
  src/accounts/ext/ithaca/ERC7821.sol
  src/utils/ext/ithaca/BLS.sol
  test/ext/ithaca/BLS.t.sol
  test/ext/ithaca/ERC7821.t.sol
  test/utils/mocks/ext/ithaca/MockERC7821.sol
)
for f in "${ITHACA_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "solady-solx preinstall: $f not found — the pinned commit may have changed. Refusing to benchmark an unexpected source tree." >&2
    exit 1
  fi
  rm "$f"
done

# Pack the monorepo's hardhat-solx (private, never published to Verdaccio)
# into ./.solx and wire it in as a content-hash-named file: devDependency,
# plus the freshness oracle at .solx/expected-dist-src — see
# scripts/benchmark/pack-hardhat-solx.ts for the how and why.
node "$MONOREPO_ROOT/scripts/benchmark/pack-hardhat-solx.ts" --target-dir "$WORKDIR"

# Pinned solx for the version-comparison cells: the wrapper config's
# "solx-0.1.8" profiles point at this binary via the plugin's `path` option
# (the plain "solx" profiles keep measuring the version the plugin ships).
node "$MONOREPO_ROOT/scripts/benchmark/download-solx.ts" --version "$SOLX_PINNED_VERSION" --out "$WORKDIR/.solx/solx-v$SOLX_PINNED_VERSION"

# Pinned forge (latest stable at pin time) for the cross-tool parity cells.
# At 1.7.1 forge's codegen is solc (solar is lint-only), so with
# FOUNDRY_SOLC=0.8.34 the compiler matches the hardhat cells. (FOUNDRY_SOLC,
# not FOUNDRY_SOLC_VERSION, which forge misparses when an [etherscan] table
# is present — see the aave-v4-solx scenario.)
rm -rf "$WORKDIR/.foundry"
node "$MONOREPO_ROOT/scripts/benchmark/download-forge.ts" --version "$FORGE_PINNED_VERSION" --out "$WORKDIR/.foundry/forge"

# Swap in the wrapper config that adds the solx build profiles. The original
# is kept as hardhat.config.base.ts, which the wrapper composes with — see
# hardhat.config.solx.ts. The shared profile factory is copied in beside it
# (the monorepo isn't importable from the checkout at hardhat runtime).
mv hardhat.config.ts hardhat.config.base.ts
cp "$E2E_TEST_DIR/hardhat.config.solx.ts" hardhat.config.ts
cp "$MONOREPO_ROOT/scripts/benchmark/solx-profiles.ts" solx-profiles.ts
