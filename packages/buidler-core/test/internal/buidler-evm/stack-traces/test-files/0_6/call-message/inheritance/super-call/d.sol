pragma solidity ^0.6.0;

contract D {

  function test() public virtual {
    revert("failed from super");
  }

}
