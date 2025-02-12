// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Counter.sol";

// Solidity tests are compatible with foundry, so they
// use the same syntax and offer the same functionality.

contract CounterTest {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function test_InitialValue() public view {
    require(counter.x() == 0, "Initial value should be 0");
  }

  function testFuzz_Inc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }
}
