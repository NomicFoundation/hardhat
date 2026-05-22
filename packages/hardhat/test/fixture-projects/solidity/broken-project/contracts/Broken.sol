// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Broken {
    function f() public pure returns (uint256) {
        return notADeclaredVariable;
    }
}
