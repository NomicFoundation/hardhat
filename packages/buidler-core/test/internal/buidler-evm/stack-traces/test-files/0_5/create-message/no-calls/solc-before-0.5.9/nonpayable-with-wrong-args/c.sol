pragma solidity ^0.5.0;

contract C {

  constructor(uint i) public {
    require(i > 0, "req");
  }

}