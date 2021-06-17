pragma solidity ^0.8.0;

contract C {
  // max uint value
  uint public x = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

  function test() public {
    x++;
  }
}
