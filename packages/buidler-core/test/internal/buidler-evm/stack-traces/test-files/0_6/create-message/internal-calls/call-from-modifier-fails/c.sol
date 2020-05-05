pragma solidity ^0.6.0;

contract C {

  modifier mm(bool b) {
    _;

    f();
  }

  constructor(bool b) mm(b) public {
  }

  function f() internal {
    revert("f failed");
  }

}
