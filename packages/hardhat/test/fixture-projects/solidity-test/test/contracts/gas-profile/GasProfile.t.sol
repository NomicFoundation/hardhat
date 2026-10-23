// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../contracts/Counter.sol";

contract GasProfileTest {
  Counter counter;

  function setUp() public {
    counter = new Counter();
  }

  function testIncTwice() public {
    counter.inc();
    counter.inc();
  }

  function testIncThenFail() public {
    counter.inc();
    require(false, "fails on purpose");
  }
}
