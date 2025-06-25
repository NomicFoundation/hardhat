// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./libs/CounterLib.sol";

contract CounterWithLib {
  using CounterLib for uint256;
  uint256 public x;

  constructor() {
    // library call in constructor (inlined/undetectable address)
    x = x.inc();
  }

  function inc() public {
    x = x.inc();
  }

  function incBy(uint256 by) public {
    require(by > 0, "incBy: positive required");
    // library call in function (address detectable after linking)
    x = x.incBy(by);
  }
}
