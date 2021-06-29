pragma solidity ^0.8.0;

contract D {

  receive () external payable {
    revert("inherited receive");
  }

}
