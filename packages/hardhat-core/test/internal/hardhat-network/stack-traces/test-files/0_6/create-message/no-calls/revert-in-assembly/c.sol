pragma solidity ^0.6.0;

contract C {

  constructor() public {
    assembly {
      revert(0, 0)
    }
  }

}
