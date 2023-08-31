// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

contract SimpleContract {
  uint256 public data;

  function setData(uint256 _newValue) external {
    data = _newValue;
  }

  function getData() external view returns (uint256) {
    return data;
  }
}
