#!/usr/bin/env bash

# Fork directly at the pinned block.
#
# The benchmark pins the mainnet fork via MAINNET_FORK_BLOCK_NUMBER (see
# scenario.json) so EDR's fork-db cache is reusable across runs. At the pinned
# commit, `_setupFork` forks at the chain head and only then rolls to the 
# pinned block. Those head RPC calls can neverbe cache hits and add network
# latency to every test.
#
# The patch makes `_setupFork` fork at the pinned block directly, leaving
# behavior unchanged when no block is pinned. It is applied here instead of
# bumping the scenario commit so the benchmarked source stays upstream.
#
# `git apply` fails if the file drifts from the patch context, which is the
# intended signal that the patch needs a refresh.
set -euo pipefail

git apply --verbose "${E2E_TEST_DIR:?}/fork-at-pinned-block.patch"
