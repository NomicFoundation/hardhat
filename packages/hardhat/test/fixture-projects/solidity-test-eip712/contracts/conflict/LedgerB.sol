// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LedgerBHolder {
  // The same encodable members as `LedgerA.sol`'s `Ledger`, plus a mapping
  // EIP-712 cannot encode: the two conflict without disagreeing on anything
  // encodable.
  struct Ledger {
    address owner;
    uint256 balance;
    mapping(address => uint256) data;
  }
}
