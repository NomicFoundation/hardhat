pragma solidity ^0.5.0;

contract C {

  modifier m(bool b) {
    assert(b);
    _;
  }

  constructor(bool b) m(b) public {
  }

}