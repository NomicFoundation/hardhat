#!/usr/bin/env bash
set -euo pipefail
# E2E_TEST_DIR is set by scripts/end-to-end/subcommands/init.ts (see
# runPreinstallScript) to this scenario's directory — the one holding
# scenario.json — so we can reach the shared helper in end-to-end/_shared/.
. "$E2E_TEST_DIR/../_shared/foundry-install.sh"
install_foundry v1.10.0

# The upstream repo builds with Hardhat's dynamic-imports plugin; forge needs
# the Foundry deployer shims in dynamic-imports/ instead (what the repo's own
# `yarn deployers:foundry` script does). No Hardhat command runs in the forge
# benchmark, so nothing overwrites them afterwards.
mkdir -p dynamic-imports && cp -R foundry-deployers/. dynamic-imports/
