pragma solidity ^0.8.0;

contract D {

  modifier fail {
    revert("inherited modifier");
    _;
  }

}
