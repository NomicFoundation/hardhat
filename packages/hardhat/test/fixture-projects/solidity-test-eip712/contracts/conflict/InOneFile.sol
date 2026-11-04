// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LeftHolder {
  struct Conflict {
    uint256 a;
  }
}

contract RightHolder {
  // The same name as `LeftHolder`'s, with different members, declared in the
  // same file.
  struct Conflict {
    address b;
  }
}
