pragma solidity ^0.5.0;

contract C {

  modifier m(bool b) {
    assert(b);
    _;
  }

  function test(bool b) m(b) public {
  }

}