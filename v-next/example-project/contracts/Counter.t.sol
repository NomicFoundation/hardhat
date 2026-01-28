// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Counter.sol";
import "forge-std/Test.sol";

contract CounterTest is Test {
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

  function testFuzzInc(uint8 x) public {
    console.log("Fuzz testing inc");
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
    require(counter.x() == x, "Value after calling inc x times should be x");
  }

  function invariantCounterOnlyIncreases() public view {
    uint256 currentValue = counter.x();
    require(currentValue < type(uint256).max, "Counter should never overflow");
  }

  function testSnapshotGasRegion() public {
    vm.startSnapshotGas("gasRegion", "inc-10-times");
    for (uint i = 0; i < 10; i++) {
      counter.inc();
    }
    vm.stopSnapshotGas();
  }

  function testSnapshotGasLastCall() public {
    counter.inc();
    vm.snapshotGasLastCall("gasLastCall", "inc-single-call");
  }

  function testSnapshotValue() public {
    uint256 initialValue = counter.x();
    vm.snapshotValue("value", "counter-initial", initialValue);

    // After batch operation
    for (uint i = 0; i < 5; i++) {
      counter.inc();
    }
    vm.snapshotValue("value", "counter-after-batch-5", counter.x());
  }
}
