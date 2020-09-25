pragma solidity ^0.7.0;

contract D {

  function fail() public returns (uint) {
    revert("D failed");
  }

}
