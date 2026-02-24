// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "mock-dep/MockLib.sol";

contract Main {
    function getValue() public pure returns (uint256) {
        return MockLib.value();
    }
}
