pragma solidity ^0.8.0;

contract C {
  bytes public x = "abc";

  function invalidateXShort() public {
    assembly { sstore(x.slot, 64) }
  }
  function test() public returns (bytes memory) {
    invalidateXShort();
    x.pop();
  }
}
