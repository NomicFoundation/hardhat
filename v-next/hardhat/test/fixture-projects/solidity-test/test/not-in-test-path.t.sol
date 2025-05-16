// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/Counter.sol";

contract CounterTest1 {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function testInitialValue() public view {
    require(counter.x() == 0, "Initial value should be 0");
  }
}
