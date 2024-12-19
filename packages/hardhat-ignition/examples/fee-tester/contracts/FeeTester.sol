// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


contract FeeTester {
  address public owner;

  constructor() {
    owner = msg.sender;
  }

  // arbitrary function to call during fee testing
  function deleteOwner() public {
    delete owner;
  }
}
