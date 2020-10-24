pragma solidity ^0.6.0;

contract C {

  constructor() public {
    fail();
  }

  function fail() internal {
    revert("internal");
  }
}
