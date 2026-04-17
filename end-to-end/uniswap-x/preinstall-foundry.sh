if [ -z "${FOUNDRY_RPC_URL}" ]; then
  echo "Error: FOUNDRY_RPC_URL is not set" >&2
  exit 1
fi

# CaliburEntry.sol has `pragma solidity 0.8.29;` (exact) and requires `via_ir`,
# which conflicts with the main project's pinned 0.8.30 / no-via_ir settings.
# Build calibur in isolation so CaliburEntry's artifact is produced on disk.
(cd lib/calibur && forge build)

# Restore the original explicit artifact path for vm.getCode. The upstream
# fork shortened it to "CaliburEntry.sol" for Hardhat compat, but that form
# requires CaliburEntry to be in forge test's compile graph — impossible
# without patching the submodule because of the pragma/via_ir conflicts above.
# The existing `fs_permissions` entry for `./lib/calibur/out/` already grants
# read access to the pre-built artifact.
sed -i 's|vm.getCode("CaliburEntry.sol")|vm.getCode("lib/calibur/out/CaliburEntry.sol/CaliburEntry.json")|' \
  test/native-input/DelegationHandler.sol

# Drop the default profile's `no_match_path = "*/integration/*"` so `forge test`
# runs the integration suite — matches EDR's default of running everything.
sed -i '/^no_match_path *= *"\*\/integration\/\*"$/d' foundry.toml
