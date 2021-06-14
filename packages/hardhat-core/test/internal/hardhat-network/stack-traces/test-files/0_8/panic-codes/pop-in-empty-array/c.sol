pragma solidity ^0.8.0;

contract C {
  uint[] public a;
  function test() public {
    a.pop();
  }
}
