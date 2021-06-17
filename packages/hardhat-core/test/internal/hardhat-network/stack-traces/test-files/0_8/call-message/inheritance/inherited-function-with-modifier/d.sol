pragma solidity ^0.8.0;

contract D {

  modifier fail {
    revert("inherited function with modifier");
    _;
  }

  function test() fail external {
  }

}
