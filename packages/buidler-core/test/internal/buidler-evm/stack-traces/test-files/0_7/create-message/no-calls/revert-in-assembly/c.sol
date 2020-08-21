pragma solidity ^0.7.0;

contract C {

  constructor() public {
    assembly {
      revert(0, 0)
    }
  }

}
