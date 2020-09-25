pragma solidity ^0.7.0;

contract C {

  function test(bool b) mm(b) public {
  }

  modifier mm(bool b) {
    _;
    _;
    revert();
    _;
  }

}
