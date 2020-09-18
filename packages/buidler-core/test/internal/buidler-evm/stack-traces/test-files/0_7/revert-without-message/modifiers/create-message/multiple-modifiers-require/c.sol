pragma solidity ^0.7.0;

contract C {
  uint i;
  modifier m2(bool b)  {
    require(b);
    _;
  }

  constructor(bool b) m1(b) m2(b) public {
    revert();
  }

  modifier m1(bool b)  {
    _;
  }

}
