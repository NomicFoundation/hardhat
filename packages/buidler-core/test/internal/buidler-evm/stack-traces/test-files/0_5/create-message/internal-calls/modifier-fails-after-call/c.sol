pragma solidity ^0.5.0;

contract C {

  modifier mm(bool b) {
    _;

    f();

    require(b, "ReqMsg");
  }

  constructor(bool b) mm(b) public {
  }

  function f() internal {

  }

}