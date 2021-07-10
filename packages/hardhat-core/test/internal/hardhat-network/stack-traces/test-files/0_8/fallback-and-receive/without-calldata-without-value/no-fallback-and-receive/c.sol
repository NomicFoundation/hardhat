pragma solidity ^0.8.0;

contract C {


  receive () external payable {
    revert('receive failed');
  }

}

