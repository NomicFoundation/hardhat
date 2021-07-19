pragma solidity ^0.8.0;

function div(uint a, uint b) returns (uint) {
  return a / b;
}

contract C {
  uint x;

  function test() public {
    x = div(1, 0);
  }
}
