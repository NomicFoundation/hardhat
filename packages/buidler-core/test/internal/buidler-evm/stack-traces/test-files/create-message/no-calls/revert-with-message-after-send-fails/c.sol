pragma solidity ^0.5.0;

contract C {

  constructor() public {
    address(this).send(1);
    revert("r");
  }

  function () payable external {
  }

}