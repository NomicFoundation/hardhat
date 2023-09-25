// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

contract C {
  function getC() public pure returns (uint256) {
    return 3;
  }
}

contract B {
  uint256 b;
  string s;

  constructor(uint256 _b, string memory _s) {
    b = _b;
    s = _s;
  }

  function getB() public view returns (uint256) {
    return b;
  }
}
