// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./libs/CounterLib.sol";

contract CounterWithArgsAndLib {
  using CounterLib for uint256;
  uint256 public x;
  bool public active;

  constructor(uint256 _initialX, bool _active) {
    // library call in constructor (inlined/undetectable address)
    x = _initialX.inc();
    active = _active;
  }

  function inc() public {
    require(active, "Counter is inactive");
    x = x.inc();
  }

  function incBy(uint256 by) public {
    require(active, "Counter is inactive");
    require(by > 0, "incBy: positive required");
    // library call in function (address detectable after linking)
    x = x.incBy(by);
  }
}
