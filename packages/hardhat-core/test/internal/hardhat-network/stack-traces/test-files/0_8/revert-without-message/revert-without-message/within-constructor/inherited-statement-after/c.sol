pragma solidity ^0.8.0;

contract D {
  uint i = 0;
  
  constructor() public  payable {


    revert();
    i += 1;
  }
}

contract C is D {
  uint public j;
}
