pragma solidity ^0.8.0;

contract C {

  constructor() public {
    assembly {
      revert(0, 0)
    }
  }

}
