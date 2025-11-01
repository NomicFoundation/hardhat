// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
  uint256 public x;

  function inc() public {
    x++;
  }

  function add(uint256 amount) public {
    x += amount;
  }

  function add(uint256 amount, bool double) public {
    if (double) {
      x += amount * 2;
    } else {
      x += amount;
    }
  }
}
