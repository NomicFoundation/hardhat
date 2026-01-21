// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../contracts/Counter.sol";
import "forge-std/Test.sol";

/**
 * This test contract is intentionally duplicated from
 * v-next/example-project/contracts/Counter.t.sol to test gas
 * snapshot functionality in the hardhat gas analytics plugin.
 */
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
}
