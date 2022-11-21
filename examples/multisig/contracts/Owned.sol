// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Owned {
  address public owner;
  uint public count;

  constructor(address _owner) {
    owner = _owner;
  }

  function inc() public {
    require(msg.sender == owner, "Only owner can inc");
    count++;
  }
}
