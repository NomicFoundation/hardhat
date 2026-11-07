// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Holder {
  struct Inner {
    uint256 x;
  }
}

interface IHolder {
  // A struct declared inside an interface, depending on one declared inside a
  // contract. A canonical type names both by their bare names.
  struct Outer {
    Holder.Inner inner;
    bool flag;
  }
}
