// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256 result) {
    // The entire assembly block is always treated as executed
    assembly {
      result := add(n, 5)
    }
  }
}
