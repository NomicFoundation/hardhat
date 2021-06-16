pragma solidity ^0.8.1;

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
