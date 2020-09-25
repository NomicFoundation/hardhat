pragma solidity ^0.6.0;

contract C {
  
  uint i = 0;

  fallback() external {


    revert();
    i += 1;
  }

}
