pragma solidity ^0.7.0;

contract D {

  fallback () external {
    revert("inherited fallback");
  }

}
