pragma solidity ^0.7.0;

contract C {

  function test() public {
    fail();
  }

  function fail() internal {
    revert("internal");
  }
}
