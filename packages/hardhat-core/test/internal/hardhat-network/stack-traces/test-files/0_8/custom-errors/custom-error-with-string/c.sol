pragma solidity ^0.8.4;

contract C {
  error MyError(uint code, string reason);

  function test() public {
    revert MyError(42, "failure reason");
  }
}
