pragma solidity ^0.5.0;

contract D {

  function fail() public returns (uint) {
    revert("D failed");
  }

}
