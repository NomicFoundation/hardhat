pragma solidity ^0.7.0;

contract D {

  modifier fail {
    revert("inherited modifier");
    _;
  }

}
