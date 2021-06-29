pragma solidity ^0.8.0;

contract C {
  error CustomError();

  modifier m(bool b) {
    revert CustomError();
    _;
  }

  function test(bool b) m(b) public {
  }
}
