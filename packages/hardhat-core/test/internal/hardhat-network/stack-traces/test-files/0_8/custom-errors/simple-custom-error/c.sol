pragma solidity ^0.8.4;

contract C {
  error Unauthorized();

  function test() public {
    revert Unauthorized();
  }
}
