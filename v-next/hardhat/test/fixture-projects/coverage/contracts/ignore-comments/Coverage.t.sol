// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Coverage.sol";

contract CoverageTest {
  Coverage cv;

  function setUp() public {
    cv = new Coverage();
  }

  function testNumberClassZero() public view {
    cv.runNumber(0);
  }
}
