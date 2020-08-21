pragma solidity ^0.7.0;


contract D {

  function fail() public {
    revert("D failed");
  }

}
