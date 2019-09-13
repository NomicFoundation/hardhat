pragma solidity ^0.5.0;

contract D {
  function f() public {
  }
}

contract C {

  constructor() public {
    D(0x12345678901234567890).f();
  }

}
