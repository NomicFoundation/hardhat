pragma solidity ^0.8.0;

contract D {

  function test() public virtual {
    revert("failed from super");
  }

}
