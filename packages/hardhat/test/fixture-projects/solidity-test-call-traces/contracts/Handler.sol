// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Handler {
  uint256 public count;

  function bump() external {
    count += 1;
  }
}
