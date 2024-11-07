// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// This is a simple smart contract used to demonstrate
// a Solidity test in `Counter.t.sol`.

contract Counter {
  uint public x;

  function inc() public {
    x++;
  }
}
