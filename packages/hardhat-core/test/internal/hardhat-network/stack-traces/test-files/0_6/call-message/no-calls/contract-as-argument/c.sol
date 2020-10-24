pragma solidity ^0.6.0;

contract D {
  function f() public returns (bool) {
    return false;
  }
}

interface I {
  function f() external returns (uint);
}

contract C {

  function test() public {
    fail(new D());
  }

  function fail(D d) public {
    require(d.f(), "D.f returned false");
  }

  function fail2(I i) public {

  }

}
