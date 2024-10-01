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

  function testInc() public {
    counter.inc();
    require(counter.x() == 1, "Value after inc should be 1");
  }
}
