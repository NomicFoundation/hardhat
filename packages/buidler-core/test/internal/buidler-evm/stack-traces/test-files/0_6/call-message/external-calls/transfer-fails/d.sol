pragma solidity ^0.6.0;

contract D {

  receive () payable external {
    revert("D failed");
  }

}
