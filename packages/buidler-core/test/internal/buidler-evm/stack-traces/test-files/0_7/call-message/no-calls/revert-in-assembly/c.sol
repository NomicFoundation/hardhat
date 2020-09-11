pragma solidity ^0.7.0;

contract C {

  function test() public {
    assembly {
      revert(0, 0)
    }
  }

}
