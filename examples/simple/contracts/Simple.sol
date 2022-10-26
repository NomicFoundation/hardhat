// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Simple {
    uint256 public count = 10;

    function inc(uint256 n) public {
        require(n > 0, "n must be positive");
        count += n;
    }
}
