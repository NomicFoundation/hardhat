pragma solidity ^0.8.0;

contract C {
  
  uint i = 0;

  fallback() external {


    revert();
    i += 1;
  }

}
