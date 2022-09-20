pragma solidity ^0.5.0;

library IgnoredL {

  function check(bool b) public {
    require(b, "check");
  }

}