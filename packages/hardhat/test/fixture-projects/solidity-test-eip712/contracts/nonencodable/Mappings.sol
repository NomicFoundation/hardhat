// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct WithMapping {
  mapping(address => uint256) balances;
  uint256 total;
}

struct HoldsMapping {
  WithMapping inner;
  uint256 x;
}
