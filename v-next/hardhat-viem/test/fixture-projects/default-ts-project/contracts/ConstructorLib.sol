// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

library ConstructorLib {
  function libDo(uint256 n) external pure returns (uint256) {
    return n * n;
  }
}
