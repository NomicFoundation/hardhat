pragma solidity ^0.5.0;

contract C {

  function test(bool b) mm(b) public {
  }

  modifier mm(bool b) {
    _;
    _;
    require(b);
    _;
  }

}