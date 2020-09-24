pragma solidity ^0.6.0;

contract C {
  uint i;
  modifier m2()  {
    i += 1;
    revert();
    _;
  }

  function test(bool b) m1(b) m2 public {
    revert();
  }

  modifier m1(bool b)  {
    _;
  }

}
