pragma solidity ^0.5.0;

contract C {

  function test() public {
    address(this).send(1);
    revert("r");
  }

  function () payable external {
  }

}