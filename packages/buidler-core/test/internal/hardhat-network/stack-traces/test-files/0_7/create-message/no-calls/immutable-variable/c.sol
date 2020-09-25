pragma solidity ^0.7.0;

contract C {
  uint immutable x = 42;

  constructor() public {
    revert("asd");
  }

  function get2X() public returns (uint) {
    return 2*x;
  }

}
