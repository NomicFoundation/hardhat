// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Counter} from "../contracts/Counter.sol";

contract CounterTest {
  function testIncrement() public {
    Counter counter = new Counter();
    counter.increment();
    require(counter.count() == 1, "count should be 1");
  }
}
