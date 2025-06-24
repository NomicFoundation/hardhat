// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract CounterWithArgs {
  uint256 public x;
  bool public enabled;

  constructor(uint256 _initialX, bool _enabled) {
    x = _initialX;
    enabled = _enabled;
  }

  function inc() public {
    require(enabled, "Counter is disabled");
    x += 1;
  }

  function incBy(uint256 by) public {
    require(enabled, "Counter is disabled");
    require(by > 0, "incBy: positive required");
    x += by;
  }
}
