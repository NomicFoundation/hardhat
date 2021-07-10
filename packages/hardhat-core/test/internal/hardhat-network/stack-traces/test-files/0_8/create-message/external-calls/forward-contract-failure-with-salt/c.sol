pragma solidity ^0.8.0;

import "./d.sol";

contract C {

  constructor() public
  {
  }

  function test() public {
    D d = new D{salt: 0x1234567812345678123456781234567812345678123456781234567812345678}();
    d.fail();
  }
}
