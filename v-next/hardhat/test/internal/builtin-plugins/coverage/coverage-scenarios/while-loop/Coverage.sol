// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256) {
    uint256 sum = 0;

    // This is executed - valid loop condition
    uint256 i = 0;
    while (i < n) {
      sum += i;
      i++;
    }

    // This content of the loop is not executed - the loop condition is false at the beginning
    i = 1000;
    while (i < n) {
      sum += i;
      i++;
    }

    // This is executed, but it exits at the `continue`
    i = 0;
    while (i < n) {
      i++;
      continue;

      // Not executed
      sum++;
    }

    // Nested loops - both are executed
    i = 0;
    while (i < n) {
      uint256 j = 0;

      while (j < n) {
        sum += i;
        j++;
      }

      i++;
    }

    return sum;
  }
}
