// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// This contract imports from a path that requires remapping
// Without foundry.toml, the plugin won't provide remappings
// and this import will fail to resolve
import "missing-dep/MissingLib.sol";

contract Main {
    function getValue() public pure returns (uint256) {
        return MissingLib.value();
    }
}
