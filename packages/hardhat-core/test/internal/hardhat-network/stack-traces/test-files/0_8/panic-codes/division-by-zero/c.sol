pragma solidity ^0.8.0;

contract C {
  uint public x = 1;
  uint public y = 0;
  uint public z;

  function test() public {
    z = x / y;
  }
}
