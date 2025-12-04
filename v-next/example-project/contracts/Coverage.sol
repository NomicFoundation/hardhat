// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint8) {
    if (n == 0) {
      return 0;
    } else {
      return 2;
    }
  }
}
