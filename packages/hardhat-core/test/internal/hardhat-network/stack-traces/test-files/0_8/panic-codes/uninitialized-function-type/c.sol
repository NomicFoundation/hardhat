pragma solidity ^0.8.0;

contract C {
  function () internal f;

  function test() public returns (bytes memory) {
    f();
  }
}
