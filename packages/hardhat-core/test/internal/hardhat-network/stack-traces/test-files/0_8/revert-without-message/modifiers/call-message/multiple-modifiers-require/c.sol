pragma solidity ^0.8.0;

contract C {

  modifier m2(bool b)  {
    require(b);
    _;
  }

  function test(bool b) m1(b) m2(b) public {
    revert();
  }

  modifier m1(bool b)  {
    _;
  }

}
