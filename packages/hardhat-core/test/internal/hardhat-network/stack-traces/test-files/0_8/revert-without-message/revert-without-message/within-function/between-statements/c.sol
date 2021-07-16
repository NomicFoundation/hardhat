pragma solidity ^0.8.0;

contract C {
  
  uint i = 0;
  uint j = 0;

  function test() public {
    i += 1;
    revert();
    j += 2;
  }

}
