// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Counter} from "../contracts/Counter.sol";

// The test of these contracts compiles this file with its own compiler
// settings. `OverrideB.t.sol` compiles these contracts again with the default
// settings.
contract OverrideBase {
  function deployCounter() internal returns (Counter) {
    return new Counter();
  }
}

contract OverrideATest is OverrideBase {
  function testA() public {
    Counter counter = deployCounter();
    counter.increment();
  }
}
