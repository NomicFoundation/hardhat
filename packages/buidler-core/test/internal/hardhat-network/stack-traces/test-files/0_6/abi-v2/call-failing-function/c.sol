pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./d.sol";

contract C {
  function test() public {
    D d = new D();

    d.fail();
  }
}
