pragma solidity ^0.7.0;

contract C {
  
  uint i = 0;

  receive() external  payable {


    require(false);
    i += 1;
  }

}
