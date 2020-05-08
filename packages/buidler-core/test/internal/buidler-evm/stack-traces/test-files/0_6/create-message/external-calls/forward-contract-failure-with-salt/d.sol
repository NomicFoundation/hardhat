pragma solidity ^0.6.0;


contract D {

  function fail() public {
    revert("D failed");
  }

}
