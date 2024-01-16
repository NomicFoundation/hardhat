/* SPDX-License-Identifier: MIT */

pragma abicoder v2;
pragma solidity ^0.8.19;

import "./B.sol";

contract A {
    uint256 private storedData;

    function set(uint256 value) public {
        storedData = value;
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}
