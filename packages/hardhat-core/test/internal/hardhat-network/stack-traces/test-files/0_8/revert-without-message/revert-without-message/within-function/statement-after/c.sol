pragma solidity ^0.8.0;

contract C {
  
  uint i = 0;

  function test() public {
    

    revert();
    i += 1;
  }

}
