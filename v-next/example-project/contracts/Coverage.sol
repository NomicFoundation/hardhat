// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  uint256 public counter;

  function numberClass(uint256 n) public pure returns (uint8) {
    if (n == 0) {
      return 0;
    } else if (n % 2 == 0) {
      return 1;
    } else {
      return 2;
    }
  }
}
