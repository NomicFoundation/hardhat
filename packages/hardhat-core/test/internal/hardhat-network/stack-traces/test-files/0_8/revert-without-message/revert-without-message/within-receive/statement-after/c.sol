pragma solidity ^0.8.0;

contract C {
  
  uint i = 0;

  receive() external  payable {
    

    revert();
    i += 1;
  }

}
