// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// This import requires remapping resolution
// The hook should fail because forge can't parse the invalid foundry.toml
import "some-lib/SomeLib.sol";

contract Main {
    function getValue() public pure returns (uint256) {
        return SomeLib.value();
    }
}
