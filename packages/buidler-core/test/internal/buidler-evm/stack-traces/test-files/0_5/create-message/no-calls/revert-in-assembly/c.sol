pragma solidity ^0.5.0;

contract C {

  constructor() public {
    assembly {
      revert(0, 0)
    }
  }

}