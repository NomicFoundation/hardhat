// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract Coverage {
  function runNumber(uint256 n1, uint256 n2) public pure returns (uint256) {
    uint256 a = 0;

    if (n1 == 0) {
      // Go here
      a = 0;
    } else {
      a = 2;
    }

    if (n2 == 0) {
      a = 0;
    } else {
      // Go here
      a = 2;
    }

    if (n1 == 100) {
      a = 0;
    } else if (n1 == 200) {
      a = 2;
    } else if (n1 == 300) {
      a = 3;
    } else {
      // Go here
      a = 4;
    }

    if (n1 == 0) {
      // Go here
      if (n2 == 0) {
        a = 0;
      } else {
        // Go here
        a = 2;
      }
    } else {
      a = 2;
    }

    return a;
  }
}
