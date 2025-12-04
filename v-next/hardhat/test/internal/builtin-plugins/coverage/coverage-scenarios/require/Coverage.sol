// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256) {
    require(n > 1, "n too small");

    uint256 sum = 0;

    require(n > 100, "n too small");

    return sum;
  }
}
