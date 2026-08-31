#!/usr/bin/env bash
set -euo pipefail
# E2E_TEST_DIR is set by scripts/end-to-end/subcommands/init.ts (see
# runPreinstallScript) to this scenario's directory — the one holding
# scenario.json — so we can reach the shared helper in end-to-end/_shared/.
. "$E2E_TEST_DIR/../_shared/foundry-install.sh"
install_foundry v1.7.1
