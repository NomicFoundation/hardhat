// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Token {
  uint256 public totalSupply;

  constructor(uint256 initialSupply) {
    totalSupply = initialSupply;
  }
}
