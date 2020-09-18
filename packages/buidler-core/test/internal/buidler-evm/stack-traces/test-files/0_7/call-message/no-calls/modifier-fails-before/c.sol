pragma solidity ^0.7.0;

contract C {

  modifier m(bool b) {
    assert(b);
    _;
  }

  function test(bool b) m(b) public {
  }

}
