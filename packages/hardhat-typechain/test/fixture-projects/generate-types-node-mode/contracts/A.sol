// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract A {
  event MessageRead(address indexed reader, uint256 count);
  event Ping();

  function getMessage() external pure returns (string memory) {
    return "Hello from A contract!";
  }
}
