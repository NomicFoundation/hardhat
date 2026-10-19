// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Same shape as Counter, so its bytecode is close enough to Counter's that a
// trace would label it Counter if only Counter's artifact were known.
contract Tally {
  uint256 public total;

  function add() external {
    total += 2;
  }
}
