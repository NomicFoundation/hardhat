pragma solidity ^0.7.0;

contract D {

  function test() public virtual {
    revert("failed from super");
  }

}
