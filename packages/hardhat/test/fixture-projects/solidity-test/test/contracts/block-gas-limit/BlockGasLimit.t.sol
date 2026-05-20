// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../contracts/Counter.sol";

contract BlockGasLimitTest {
  Counter counter;
  mapping(uint => uint) private store;

  function setUp() public {
    counter = new Counter();
  }

  function testGasBand() public {
    // ~100 cold SSTOREs to unique slots, ~22_100 gas each → ~2.2M gas total.
    // Sits cleanly between the "low" block gas limit (500K)
    // and the "high" limit (30M).
    for (uint i = 0; i < 100; i++) {
      store[i] = i + 1;
    }
  }
}
