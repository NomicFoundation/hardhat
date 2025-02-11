// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// A contrived example of a contract that can be upgraded
contract Demo {
  function version() public pure returns (string memory) {
    return "1.0.0";
  }
}
