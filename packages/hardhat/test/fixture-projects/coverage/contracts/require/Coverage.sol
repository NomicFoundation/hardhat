// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256) {
    require(n > 1, "n too small");

    return n;
  }
}
