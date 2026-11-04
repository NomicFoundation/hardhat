// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Declares the same name as `contracts/Permit.sol` with different members, so
// the two clash unless one of the files is excluded from EIP-712 collection.
struct Permit {
  address holder;
  uint256 amount;
  uint256 deadline;
}
