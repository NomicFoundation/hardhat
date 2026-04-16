// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {A} from "./A.sol";

contract ATest {
  A a;

  function setUp() public {
    a = new A();
  }

  function test_Assertion() public view {
    require(1 == 1, "test assertion");
  }
}
