pragma solidity ^0.8.0;

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
