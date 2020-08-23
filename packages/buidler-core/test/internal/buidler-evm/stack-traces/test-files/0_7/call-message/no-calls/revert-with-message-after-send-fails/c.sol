pragma solidity ^0.7.0;

contract C {

  function test() public {
    address(this).send(1);
    revert("r");
  }

  receive () payable external {
  }

}
