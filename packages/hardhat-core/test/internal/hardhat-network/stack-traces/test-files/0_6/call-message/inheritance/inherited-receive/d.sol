pragma solidity ^0.6.0;

contract D {

  receive () external payable {
    revert("inherited receive");
  }

}
