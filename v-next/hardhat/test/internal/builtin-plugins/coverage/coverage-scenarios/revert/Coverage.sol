// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract Coverage {
  function runNumber(uint256 n) public pure returns (uint256) {
    revert("Forced failure");

    return n;
  }
}
