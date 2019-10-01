pragma solidity ^0.5.0;

contract D {

  function test() public {
    revert("failed from super");
  }

}