// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract EventArgValue {
  event EventValue(uint256 value);

  bool public argWasValidated;

  constructor() {
    emit EventValue(42);
  }

  function validateEmitted(uint256 arg) public {
    argWasValidated = true;

    require(arg == 42, "arg is wrong");
  }
}

contract PassingValue {
  constructor() payable {}

  function deposit() public payable {}
}
