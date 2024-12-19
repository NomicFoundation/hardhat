// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract UsesContract {
  address public contractAddress;

  constructor(address _contract) {
    contractAddress = _contract;
  }

  function setAddress(address _contract) public {
    contractAddress = _contract;
  }
}
