pragma solidity ^0.7.0;

contract D {
  function f() public {
  }
}

contract C {

  function test() public {
    D(0x12345678901234567890).f();
  }

}
