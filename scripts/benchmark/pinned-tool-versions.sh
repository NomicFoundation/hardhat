# Pinned tool versions for the solx benchmark scenarios (the end-to-end
# dirs with a hardhat.config.solx.ts).
#
# Sourced by each scenario's preinstall.sh; feeds the download-solx.ts and
# download-forge.ts invocations so a version bump is a one-line edit here.
#
# What this file does NOT control:
#   - the solx version the hardhat-solx plugin itself ships (the
#     SOLIDITY_TO_SOLX_VERSION_MAP in packages/hardhat-solx): the plain
#     "solx" cells measure that version, not this pin;
#   - the replay pin in .github/workflows/solx-regression-benchmark.yml
#     (its --solx-version flag), which replays the shipped map's version;
#   - the "solx-0.1.7" profile names (solx-profiles.ts), the scenario.json
#     cell names ("cold compile solx-0.1.7", "cold compile forge-1.7.1"),
#     and render-solx-tables.ts's CELL_NOTES keys for those cells. They name
#     the pinned versions, so bumping a pin here means renaming them in
#     lockstep — pinned-tool-versions.test.ts fails on drift and points at
#     the places. Note that renamed cells start NEW series in the
#     benchmark-results history; the old series stop updating.
SOLX_PINNED_VERSION="0.1.7"
FORGE_PINNED_VERSION="1.7.1"
