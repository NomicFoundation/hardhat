// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Counter {
    uint256 public count;

    function inc() external {
        count += 1;
    }
}
