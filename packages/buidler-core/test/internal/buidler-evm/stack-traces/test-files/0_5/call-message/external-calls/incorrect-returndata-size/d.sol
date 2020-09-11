pragma solidity ^0.5.0;

contract D {

  function fail() public returns (uint256) {
    assembly {
      return(0, 0)
    }
  }

}
