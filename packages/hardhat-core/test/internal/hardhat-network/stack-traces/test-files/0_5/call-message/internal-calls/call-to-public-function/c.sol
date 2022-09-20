pragma solidity ^0.5.0;

contract C {

  function test() public {
    fail();
  }

  function fail() public {
    revert("public");
  }
}