// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Declared identically in `Right.sol`, so the two collapse to one definition
// instead of clashing.
struct Twin {
  uint256 x;
  address owner;
}
