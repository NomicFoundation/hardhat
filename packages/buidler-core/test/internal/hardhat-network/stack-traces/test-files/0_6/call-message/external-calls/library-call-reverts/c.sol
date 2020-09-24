pragma solidity ^0.6.0;

import "./l.sol";

contract C {

  function test(bool b) public {
    L.check(b);
  }

}
