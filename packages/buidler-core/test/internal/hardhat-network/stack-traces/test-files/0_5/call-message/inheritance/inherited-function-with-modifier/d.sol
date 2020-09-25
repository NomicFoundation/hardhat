pragma solidity ^0.5.0;

contract D {

  modifier fail {
    revert("inherited function with modifier");
    _;
  }

  function test() fail external {
  }

}