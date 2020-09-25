pragma solidity ^0.7.0;

import "./l.sol";

contract C {

  function test(bool b) public {
    L.check(b);
  }

}
