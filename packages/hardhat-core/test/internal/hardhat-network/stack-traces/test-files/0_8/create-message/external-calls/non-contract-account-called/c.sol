pragma solidity ^0.8.0;

contract D {
  function f() public {
  }
}

contract C {

  constructor() public {
    D(address(0x12345678901234567890)).f();
  }

}
