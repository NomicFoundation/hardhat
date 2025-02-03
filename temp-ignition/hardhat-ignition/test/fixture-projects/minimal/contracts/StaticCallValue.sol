// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract StaticCallValue {
  function getValue() public pure returns (uint256) {
    return 42;
  }
}
