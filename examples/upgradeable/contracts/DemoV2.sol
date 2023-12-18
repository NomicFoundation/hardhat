// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// A contrived example of a contract that can be upgraded
contract DemoV2 {
  function version() public pure returns (string memory) {
    return "2.0.0";
  }
}
