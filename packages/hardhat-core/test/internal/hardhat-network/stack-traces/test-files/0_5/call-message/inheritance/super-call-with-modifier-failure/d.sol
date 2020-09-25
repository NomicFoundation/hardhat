pragma solidity ^0.5.0;

contract D {

  function test() m public {
  }

  modifier m {
    revert("m failed");
    _;
  }

}