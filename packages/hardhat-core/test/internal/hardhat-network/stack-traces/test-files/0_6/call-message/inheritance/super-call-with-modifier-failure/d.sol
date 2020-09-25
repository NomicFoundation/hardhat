pragma solidity ^0.6.0;

contract D {

  function test() m public virtual {
  }

  modifier m {
    revert("m failed");
    _;
  }

}
