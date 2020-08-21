pragma solidity ^0.7.0;

contract C {

  modifier mm(bool b) {
    _;

    f();

    require(b, "ReqMsg");
  }

  function test(bool b) mm(b) public {
  }

  function f() internal {

  }

}
