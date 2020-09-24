pragma solidity ^0.7.0;

contract C {

  modifier m2()  {
    revert("");
    _;
  }

  constructor(bool b) m1(b) m2 public {
    revert("");
  }

  modifier m1(bool b)  {
    _;
  }

}
