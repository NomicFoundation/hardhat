pragma solidity ^0.8.0;

import "./l.sol";

contract C {

  function test(bool b) public {
    IgnoredL.check(b);
  }

}
