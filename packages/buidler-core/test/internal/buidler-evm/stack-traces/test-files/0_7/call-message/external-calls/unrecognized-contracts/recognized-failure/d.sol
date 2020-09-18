pragma solidity ^0.7.0;

// Contracts starting with Ignored
// are ignored by the tracer
contract IgnoredD {

  function fail() public {
    D d = new D();
    d.fail();
  }

}

contract D {

  function fail() public returns (uint) {
    revert("D failed");
  }

}
