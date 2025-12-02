// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage2 {
  uint256 public counter;

  function numberClass(uint256 n) public pure returns (uint8) {
    uint256 a = n > 100 ? 1 : 2;

    if (n == 0) {
      return 0;
    } else {
      return 2;
    }
  }
}
