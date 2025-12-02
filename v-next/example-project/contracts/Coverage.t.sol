// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Coverage.sol";

contract CoverageTest {
  Coverage bp;

  function setUp() public {
    bp = new Coverage();
  }

  function testNumberClassZero() public view {
    require(bp.numberClass(0) == 0, "numberClass(3) should be 2");
    require(bp.numberClass(2) == 0, "numberClass(3) should be 2");
  }
}
