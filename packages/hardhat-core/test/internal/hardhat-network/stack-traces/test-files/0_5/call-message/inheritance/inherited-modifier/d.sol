pragma solidity ^0.5.0;

contract D {

  modifier fail {
    revert("inherited modifier");
    _;
  }

}