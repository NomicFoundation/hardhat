pragma solidity ^0.6.0;

contract D {

  function fail() public returns (uint) {
    revert("D failed");
  }

}
