// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Counter.sol";
import "hardhat/console.sol";

contract CounterTest {
  Counter counter;

  function setUp() public {
    console.log("Setting up");
    counter = new Counter();
    console.log("Counter set up");
  }

  function testInitialValue() public view {
    console.log("Testing initial value");
    require(counter.x() == 0, "Initial value should be 0");
  }

  function testFailInitialValue() public view {
    console.log("Testing initial value fail");
    require(counter.x() == 1, "Initial value should be 1");
  }

  function testFuzzInc(uint8 x) public {
    console.log("Fuzz testing inc");
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }

  function testFailFuzzInc(uint8 x) public {
    console.log("Fuzz testing inc fail");
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
    console.log("Setting up");
    counter = new Counter();
    console.log("Counter set up");
  }

  function testInitialValue() public view {
    console.log("Testing initial value");
    require(counter.x() == 1, "Initial value should be 1");
  }

  function testFuzzInc(uint8 x) public {
    console.log("Fuzz testing inc");
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(
      counter.x() == x + 1,
      "Value after calling inc x times should be x + 1"
    );
  }

  function testFailFuzzInc(uint8 x) public {
    console.log("Fuzz testing inc fail");
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }

  // function invariant() public pure {
  //   assert(false);
  // }
}
