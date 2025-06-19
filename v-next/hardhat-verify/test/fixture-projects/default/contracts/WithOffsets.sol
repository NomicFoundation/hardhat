// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./libs/MathLib.sol";

contract WithOffsets {
  address public immutable owner;

  constructor(address _owner) {
    owner = _owner;
  }

  function sum(uint256 a, uint256 b) public pure returns (uint256) {
    return MathLib.add(a, b);
  }
}
