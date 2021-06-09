pragma solidity ^0.8.0;

contract C {
  uint x;
  uint[] public a = [1,2,3];
  function test() public {
    x = a[5];
  }
}
