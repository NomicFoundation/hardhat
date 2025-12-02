// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Coverage-2.sol";

contract CoverageTest2 {
  Coverage2 bp;

  function setUp() public {
    bp = new Coverage2();
  }

  function testNumberClassZero() public view {
    require(bp.numberClass(0) == 0, "numberClass(3) should be 2");
  }
}
