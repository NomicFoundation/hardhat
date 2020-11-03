pragma solidity ^0.6.0;

contract C {
  mapping(uint => uint) public x;
  function internalFunction(mapping(uint => uint) storage m) internal pure {
    revert();
  }

  function test() public {
    internalFunction(x);
  }
}
