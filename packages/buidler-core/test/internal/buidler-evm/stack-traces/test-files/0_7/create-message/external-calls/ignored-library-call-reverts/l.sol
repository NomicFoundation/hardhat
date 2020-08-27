pragma solidity ^0.7.0;

library IgnoredL {

  function check(bool b) public {
    require(b, "check");
  }

}
