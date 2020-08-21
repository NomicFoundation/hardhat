pragma solidity ^0.7.0;

contract D {

  function test() m public virtual {
  }

  modifier m {
    revert("m failed");
    _;
  }

}
