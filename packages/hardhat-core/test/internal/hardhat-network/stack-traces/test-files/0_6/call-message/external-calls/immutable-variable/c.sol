pragma solidity ^0.6.5;

contract C {
  uint immutable x = 10;

  function get2X () public returns (uint) {
    return 2*x;
  }

  function test () external {
    revert("C failed");
  }

}
