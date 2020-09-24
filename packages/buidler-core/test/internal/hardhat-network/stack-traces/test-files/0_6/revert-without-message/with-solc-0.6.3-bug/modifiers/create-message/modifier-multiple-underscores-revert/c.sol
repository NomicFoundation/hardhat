pragma solidity ^0.6.0;

contract C {

  constructor(bool b) mm(b) public {
  }

  modifier mm(bool b) {
    _;
    _;
    revert();
    _;
  }

}
