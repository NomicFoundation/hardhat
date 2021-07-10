pragma solidity ^0.8.0;

contract C {

  constructor() public {
    payable(address(this)).send(1);
    revert("r");
  }

  receive () payable external {
  }

}
