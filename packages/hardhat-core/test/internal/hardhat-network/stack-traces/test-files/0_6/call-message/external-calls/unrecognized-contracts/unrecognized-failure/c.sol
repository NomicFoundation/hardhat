pragma solidity ^0.6.0;

import "./d.sol";

contract C {

  function test() public {
    IgnoredD d = new IgnoredD();
    d.fail();
  }

}
