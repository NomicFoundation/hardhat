// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256) {
    uint256 sum = 0;

    // This is executed - valid loop condition
    for (uint256 i = 0; i < n; i++) {
      sum += i;
    }

    // This content of the loop is not executed - the loop condition is false at the beginning
    for (uint256 i = 1000; i < n; i++) {
      sum += i;
    }

    // This is executed, but it exits at the `continue`
    for (uint256 i = 0; i < n; i++) {
      continue;

      // This is not executed
      sum++;
    }

    // Nested loops - both are executed
    for (uint256 i = 0; i < n; i++) {
      for (uint256 j = 0; j < n; j++) {
        sum += i;
      }
    }

    return sum;
  }
}
