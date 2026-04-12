// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BTest {
  function test_Assertion() public view {
    require(1 == 1, "test assertion");
  }
}
