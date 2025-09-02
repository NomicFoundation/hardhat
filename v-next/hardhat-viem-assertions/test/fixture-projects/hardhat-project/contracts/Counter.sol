// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract Counter {
  uint8 public x;

  error CustomError();

  function incBy(uint8 by) public {
    x += by;
  }
}

contract CounterNestedPanicError {
  Counter public counter;

  error CustomError();

  constructor() {
    counter = new Counter();
  }

  function incBy(uint8 by) public {
    counter.incBy(by);
  }

  function nestedRevert(uint8 by) external {
    counter.incBy(by);
  }
}
