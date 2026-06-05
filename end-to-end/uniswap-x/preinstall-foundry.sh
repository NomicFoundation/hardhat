# CaliburEntry.sol has `pragma solidity 0.8.29;` (exact) and requires `via_ir`,
# which conflicts with the main project's pinned 0.8.30 / no-via_ir settings.
# Build calibur in isolation so CaliburEntry's artifact is produced on disk.
(cd lib/calibur && forge build)

# Use node for file transforms to avoid BSD/GNU sed portability issues
# (matches the convention used by the other scenarios' preinstall scripts).
node -e '
const fs = require("fs");

// Restore the original explicit artifact path for vm.getCode. The upstream
// fork shortened it to "CaliburEntry.sol" for Hardhat compat, but that form
// requires CaliburEntry to be in forge test compile graph, which is impossible
// without patching the submodule because of the pragma/via_ir conflicts above.
// The existing fs_permissions entry for ./lib/calibur/out/ already grants read
// access to the pre-built artifact.
const handlerPath = "test/native-input/DelegationHandler.sol";
const handler = fs.readFileSync(handlerPath, "utf8");
fs.writeFileSync(
  handlerPath,
  handler.replaceAll(
    "vm.getCode(\"CaliburEntry.sol\")",
    "vm.getCode(\"lib/calibur/out/CaliburEntry.sol/CaliburEntry.json\")",
  ),
);

// Drop the default profile no_match_path = "*/integration/*" so forge test
// runs the integration suite, matching EDR default of running everything.
const tomlPath = "foundry.toml";
const toml = fs.readFileSync(tomlPath, "utf8");
fs.writeFileSync(
  tomlPath,
  toml
    .split("\n")
    .filter((line) => !/^no_match_path *= *"\*\/integration\/\*"$/.test(line))
    .join("\n"),
);
'
