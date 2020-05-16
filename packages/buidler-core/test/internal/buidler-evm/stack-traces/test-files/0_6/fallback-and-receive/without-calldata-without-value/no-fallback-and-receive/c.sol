pragma solidity ^0.6.0;

contract C {


  receive () external payable {
    revert('receive failed');
  }

}

