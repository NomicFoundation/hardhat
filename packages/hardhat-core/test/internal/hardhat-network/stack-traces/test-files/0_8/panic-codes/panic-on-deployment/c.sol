pragma solidity ^0.8.0;

contract C {
  uint x;

  constructor() {
    fail();
  }

  function fail() public {
    x = 1 / x;
  }
}
