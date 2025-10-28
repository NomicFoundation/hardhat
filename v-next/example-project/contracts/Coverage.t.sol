// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Coverage.sol";

contract CoverageTest {
  Coverage bp;

  function setUp() public {
    bp = new Coverage();
  }

  function testNumberClassZero() public view {
    require(bp.numberClass(0) == 0, "numberClass(0) should be 0");
    require(bp.numberClass(3) == 2, "numberClass(3) should be 2");
  }
}
