pragma solidity ^0.6.0;

contract C {

  function test() public {
    address(this).send(1);
    revert("r");
  }

  receive () payable external {
  }

}
