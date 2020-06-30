pragma solidity ^0.6.0;

contract D {
  uint immutable x = 11;

  function get2X () public returns (uint) {
    return 2*x;
  }

  function fail(uint arg) public returns (uint) {
    revert("D failed");
    return x;
  }

}
