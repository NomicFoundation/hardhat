pragma solidity ^0.5.0;

import "./l.sol";

contract C {

  constructor(bool b) public {
    IgnoredL.check(b);
  }

}