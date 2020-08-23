pragma solidity ^0.7.0;

contract D {

  receive () external payable {
    revert("inherited receive");
  }

}
