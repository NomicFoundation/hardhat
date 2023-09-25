// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

contract A {
  address owner;

  constructor(address _owner) {
    owner = _owner;
  }

  function getA() public pure returns (uint256) {
    return 1;
  }

  function getOwner() public view returns (address) {
    return owner;
  }
}

contract B {
  function getB() public pure returns (uint256) {
    return 2;
  }
}
