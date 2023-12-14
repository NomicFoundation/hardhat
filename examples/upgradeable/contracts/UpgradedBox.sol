// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract UpgradedBox {
  uint256 private _value;

  // Emitted when the stored value changes
  event ValueChanged(uint256 value);

  // Stores a new value in the contract
  function store(uint256 value) public {
    _value = value;
    emit ValueChanged(value);
  }

  // Reads the last stored value
  function retrieve() public view returns (uint256) {
    return _value;
  }

  function version() public pure returns (string memory) {
    return "2.0.0";
  }
}
