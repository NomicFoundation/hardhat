pragma solidity ^0.5.0;

import "./c.sol";

contract D {

  function test2() public {
    C(msg.sender).test3();
  }

  function fail() public {
    revert("D failed");
  }

}
