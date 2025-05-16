// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/Counter.sol";

contract CounterTest2 {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function testInitialValue() public pure {
    revert("Should not be executed");
  }
}
