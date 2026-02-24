// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "foo/Foo.sol";

contract Main {
    function getValue() public pure returns (uint256) {
        return Foo.bar();
    }
}
