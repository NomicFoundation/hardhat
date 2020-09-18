pragma solidity ^0.7.0;

contract C {

  receive () external payable {
    revert("some error");
  }

}
