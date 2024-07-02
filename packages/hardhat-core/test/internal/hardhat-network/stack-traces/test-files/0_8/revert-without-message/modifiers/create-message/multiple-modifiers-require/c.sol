pragma solidity ^0.8.0;

contract C {
  uint i;
  modifier m2(bool b)  {
    require(b);
    _;
  }

  constructor(bool b, bool doRevert) m1(b) m2(b) public {
    // always true, used to prevent optimizations
    if (doRevert) {
      revert();
    }
  }

  modifier m1(bool b)  {
    _;
  }

}
