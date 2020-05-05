pragma solidity ^0.6.0;

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
