// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// The test of this contract first builds an older version of this file, which
// has no `bumpBy` nor `Bumped`, so that its artifact is stale.
contract Bumper {
  uint256 public count;

  event Bumped(uint256 by);

  function bump() external {
    count += 1;
  }

  function bumpBy(uint256 by) external {
    count += by;
    emit Bumped(by);
  }
}
