pragma solidity ^0.6.0;

library IgnoredL {

  function check(bool b) public {
    require(b, "check");
  }

}
