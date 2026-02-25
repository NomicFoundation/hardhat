// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "mylib/MyLib.sol";

contract Main {
    function getValue() public pure returns (uint256) {
        return MyLib.version();
    }
}
