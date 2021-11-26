pragma solidity ^0.8.0;

contract C {
  
  uint i = 0;

  constructor() public payable {
    i += 1;

    require(false);
  }

}
