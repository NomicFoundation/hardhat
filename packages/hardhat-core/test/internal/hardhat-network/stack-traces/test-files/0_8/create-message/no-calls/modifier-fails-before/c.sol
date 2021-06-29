pragma solidity ^0.8.0;

contract C {

  modifier m(bool b) {
    assert(b);
    _;
  }

  constructor(bool b) m(b) public {
  }

}
