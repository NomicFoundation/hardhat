// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract Counter {
    uint256 public count;

    function set(uint256 v) public {
        _checkPositive(v);
        count = v;
    }

    function _checkPositive(uint256 v) internal pure {
        require(v > 0, "must be positive");
    }
}
