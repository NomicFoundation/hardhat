pragma solidity ^0.8.0;

contract C {

  error CustomError();

  function test(bool b) m1(b) public {
    revert CustomError();
  }

  modifier m1(bool b)  {
    _;
  }

}
