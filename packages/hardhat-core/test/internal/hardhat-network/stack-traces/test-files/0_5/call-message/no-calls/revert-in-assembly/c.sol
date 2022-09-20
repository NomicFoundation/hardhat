pragma solidity ^0.5.0;

contract C {

  function test() public {
    assembly {
      revert(0, 0)
    }
  }

}