pragma solidity ^0.8.0;

library IgnoredL {

  function check(bool b) public {
    require(b, "check");
  }

}
