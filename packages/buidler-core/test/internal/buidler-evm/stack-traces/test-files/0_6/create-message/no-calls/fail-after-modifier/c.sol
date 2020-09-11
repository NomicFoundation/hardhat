pragma solidity ^0.6.0;

contract C {

  constructor(bool b) m1(b) public {
    revert("a");
  }

  modifier m1(bool b)  {
    _;
  }

}
