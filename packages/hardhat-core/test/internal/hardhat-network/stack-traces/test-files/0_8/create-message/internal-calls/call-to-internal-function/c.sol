pragma solidity ^0.8.0;

contract C {

  constructor() public {
    fail();
  }

  function fail() internal {
    revert("internal");
  }
}
