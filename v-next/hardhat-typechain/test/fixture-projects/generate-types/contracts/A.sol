// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract A {
  function getMessage() external pure returns (string memory) {
    return "Hello from A contract!";
  }
}
