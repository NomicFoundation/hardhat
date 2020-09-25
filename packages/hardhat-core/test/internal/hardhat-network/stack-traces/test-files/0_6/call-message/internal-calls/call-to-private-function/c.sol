pragma solidity ^0.6.0;

contract C {

  function test() public {
    fail();
  }

  function fail() private {
    revert("private");
  }
}
