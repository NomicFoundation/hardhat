pragma solidity ^0.7.1;

uint constant EXPONENT = 10;
uint constant MULTIPLIER = 2**EXPONENT;

// basic test just to check that top-level constants
// don't break anything obvious
contract C {
  function test() public {
    require(false, "failed");
  }
}
