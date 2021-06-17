pragma solidity ^0.8.0;

contract C {

  function test() public {
    fail();
  }

  function fail() public {
    revert("public");
  }
}
