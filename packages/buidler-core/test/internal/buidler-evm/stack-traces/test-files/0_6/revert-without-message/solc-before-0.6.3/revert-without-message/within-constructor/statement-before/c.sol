pragma solidity ^0.6.0;

contract C {
  
  uint i = 0;

  constructor() public payable {
    i += 1;

    revert();
  }

}
