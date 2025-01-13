// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Counter.sol";

contract CounterTest {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function testInitialValue() public view {
    require(counter.x() == 0, "Initial value should be 0");
  }

  function testFailInitialValue() public view {
    require(counter.x() == 1, "Initial value should be 1");
  }

  function testFuzzInc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }

  function testFailFuzzInc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x + 1, "Value after calling inc x times should be x + 1");
  }

  // function invariant() public pure {
  //   assert(true);
  // }
}

contract FailingCounterTest {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function testInitialValue() public view {
    require(counter.x() == 1, "Initial value should be 1");
  }

  function testFuzzInc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(
      counter.x() == x + 1,
      "Value after calling inc x times should be x + 1"
    );
  }

  function testFailFuzzInc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }

  // function invariant() public pure {
  //   assert(false);
  // }
}
