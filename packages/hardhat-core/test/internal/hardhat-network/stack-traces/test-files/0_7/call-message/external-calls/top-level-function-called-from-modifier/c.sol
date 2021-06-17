pragma solidity ^0.7.1;

function fail() {
  require(false, "top-level function failed");
}

contract C {
  modifier m() {
    fail();
    _;
  }
  function test() m public {
  }
}
