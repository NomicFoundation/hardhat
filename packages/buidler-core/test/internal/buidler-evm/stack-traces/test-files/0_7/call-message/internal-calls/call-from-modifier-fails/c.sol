pragma solidity ^0.7.0;

contract C {

  modifier mm(bool b) {
    _;

    f();
  }

  function test(bool b) mm(b) public {
  }

  function f() internal {
    revert("f failed");
  }

}
