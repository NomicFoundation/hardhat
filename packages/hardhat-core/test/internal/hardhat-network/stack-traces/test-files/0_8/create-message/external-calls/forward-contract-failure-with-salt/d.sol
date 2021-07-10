pragma solidity ^0.8.0;


contract D {

  function fail() public {
    revert("D failed");
  }

}
