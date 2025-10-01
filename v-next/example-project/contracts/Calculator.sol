// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Calculator {
  uint256 public result;

  function multiply(uint256 a, uint256 b) public {
    result = a * b;
  }

  function multiply(uint256 a, uint256 b, uint256 c) public {
    result = a * b * c;
  }

  function divide(uint256 a, uint256 b) public {
    require(b > 0, "Cannot divide by zero");
    result = a / b;
  }

  function subtract(uint256 a, uint256 b) public {
    require(a >= b, "Result would be negative");
    result = a - b;
  }

  function reset() public {
    result = 0;
  }
}
