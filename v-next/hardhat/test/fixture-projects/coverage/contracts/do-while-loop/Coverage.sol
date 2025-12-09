// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256) {
    uint256 sum = 0;

    // This is executed - valid loop condition
    uint256 i = 0;
    do {
      sum += i;
      i++;
    } while (i < n);

    // This is executed, but it exits at the `continue`
    i = 0;
    do {
      i++;
      continue;

      // Not executed
      sum++;
    } while (i < n);

    // Nested loops - both are executed
    i = 0;
    do {
      uint256 j = 0;

      do {
        sum += i;
        j++;
      } while (j < n);

      i++;
    } while (i < n);

    return sum;
  }
}
