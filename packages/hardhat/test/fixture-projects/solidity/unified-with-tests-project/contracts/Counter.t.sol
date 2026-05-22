// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Counter.sol";

contract CounterTest {
    function test_inc() external {
        Counter c = new Counter();
        c.inc();
    }
}
