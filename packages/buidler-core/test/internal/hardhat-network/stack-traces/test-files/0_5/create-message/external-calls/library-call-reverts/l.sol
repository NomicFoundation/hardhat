pragma solidity ^0.5.0;

library L {

  function check(bool b) public {
    require(b, "check");
  }

}