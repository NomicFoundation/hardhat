// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

contract Matchers {
  uint x;

  function succeeds() public {
    x++;
  }

  function succeedsView() public view returns (uint) {
    return x;
  }

  function revertsWithoutReasonString() public {
    x++;
    require(false);
  }

  function revertsWithoutReasonStringView() public pure {
    require(false);
  }
}
