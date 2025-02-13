// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

contract WithoutConstructorArgs {
  uint256 public data;
  address public owner;

  constructor() payable {
    owner = msg.sender;
  }

  function setData(uint256 _newValue) external {
    data = _newValue;
  }

  function getData() external view returns (uint256) {
    return data;
  }

  function getOwner() external view returns (address) {
    return owner;
  }
}
