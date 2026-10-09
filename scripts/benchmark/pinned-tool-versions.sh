# Pinned tool versions for the solx benchmark scenarios (the end-to-end
# dirs with a hardhat.config.solx.ts).
#
# Sourced by each scenario's preinstall.sh; feeds the download-solx.ts and
# download-forge.ts invocations so a version bump is a one-line edit here.
#
# What this file does NOT control — pinned-tool-versions.test.ts asserts
# each of these stays coherent with it:
#   - the solx version the hardhat-slang-solx plugin ships, via
#     SOLIDITY_TO_SOLX_VERSION_MAP in packages/hardhat-slang-solx. The plain
#     "solx" profiles (the standard-JSON dump step, gas-compare) resolve
#     through that map.
#   - the replay pin in .github/workflows/solx-regression-benchmark.yml
#     (its --solx-version flag). It replays the shipped map's version.
#   - the "Currently supported" line in packages/hardhat-slang-solx/README.md.
#     It documents the mapped version to users.
#   - the profile names (solx-profiles.ts), the scenario.json cell names
#     ("cold compile solx-<pin>", "cold compile forge-<pin>"), and
#     render-solx-tables.ts's CELL_NOTES keys. They name the pinned
#     versions, so a bump here means renaming them in lockstep. Renamed
#     cells start NEW series in the benchmark-results history; the old
#     series stop updating.
SOLX_PINNED_VERSION="0.1.8"
FORGE_PINNED_VERSION="1.7.1"
