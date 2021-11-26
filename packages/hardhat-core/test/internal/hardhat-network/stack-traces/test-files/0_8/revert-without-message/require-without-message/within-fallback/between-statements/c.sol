pragma solidity ^0.8.0;

contract C {
  
  uint i = 0;
  uint j = 0;

  fallback() external {
    i += 1;
    require(false);
    j += 2;
  }

}
