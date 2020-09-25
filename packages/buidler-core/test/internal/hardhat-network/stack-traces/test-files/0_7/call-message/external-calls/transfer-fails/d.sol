pragma solidity ^0.7.0;

contract D {

  receive () payable external {
    revert("D failed");
  }

}
