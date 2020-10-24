pragma solidity ^0.6.0;

contract C {
  
  uint i = 0;

  receive() external  payable {
    

    revert();
    i += 1;
  }

}
