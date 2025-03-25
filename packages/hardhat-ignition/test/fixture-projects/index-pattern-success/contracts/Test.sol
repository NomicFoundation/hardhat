// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract F1 {
  bool public firstCalled;
  bool public secondCalled;
  bool public thirdCalled;

  address public caller1;
  address public caller2;

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

  function mustBeCalledByTwoSeparateContracts() public {
    if (caller1 == address(0)) {
      caller1 = msg.sender;
    } else {
      caller2 = msg.sender;
    }
  }

  function throwsIfNotCalledTwice() public view {
    require(caller1 != address(0) && caller2 != address(0) && caller1 != caller2, "was not called by two separate contracts");
  }
}

contract F2 {

  F1 public f1;

  uint public counter;

  constructor(F1 _f1) {
    f1 = _f1;
  }

  function second() public {
    f1.second();
  }

  function mustBeCalledByTwoSeparateContracts() public {
    f1.mustBeCalledByTwoSeparateContracts();
  }

  function unrelatedFunc() public {
    counter++;
  }
}
