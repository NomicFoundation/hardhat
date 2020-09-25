pragma solidity ^0.7.0;

import "./d.sol";

contract C {
  D d;

  constructor () public {
    d = new D();
  }

  function test1() public {
    try d.fail() {} catch {
      d.test2();
    }
  }

  function test3() public {
    d.fail();
  }
}
