// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Mock.sol";

contract HelperTest {
    function test_set() external {
        Mock m = new Mock();
        m.set(42);
    }
}
