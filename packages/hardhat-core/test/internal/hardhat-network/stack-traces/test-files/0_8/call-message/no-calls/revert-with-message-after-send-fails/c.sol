pragma solidity ^0.8.0;

contract C {

  function test() public {
    payable(address(this)).send(1);
    revert("r");
  }

  receive () payable external {
  }

}
