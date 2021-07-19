pragma solidity ^0.8.0;

contract C {

  function test(bool b) m1(b) public {
    revert("a");
  }

  modifier m1(bool b)  {
    _;
  }

}
