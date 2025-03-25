// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract F1 {
  bool public firstCalled;
  bool public secondCalled;
  bool public thirdCalled;

  function first() public {
    firstCalled = true;
  }

  function second() public {
    require(firstCalled, "first() was not called");
    require(!thirdCalled, "third() was called");

    secondCalled = true;
  }

  function third() public {
    require(firstCalled, "first() was not called");
    require(secondCalled, "second() was not called");

    thirdCalled = true;
  }
}

contract F2 {

  F1 public f1;

  constructor(F1 _f1) {
    f1 = _f1;
  }

  function second() public {
    f1.second();
  }
}
