pragma solidity ^0.6.0;

contract D {

  fallback () external {
    revert("inherited fallback");
  }

}
