// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

library CounterLib {
  function inc(uint256 current) external pure returns (uint256) {
    return current + 1;
  }

  function incBy(uint256 current, uint256 by) external pure returns (uint256) {
    return current + by;
  }
}
