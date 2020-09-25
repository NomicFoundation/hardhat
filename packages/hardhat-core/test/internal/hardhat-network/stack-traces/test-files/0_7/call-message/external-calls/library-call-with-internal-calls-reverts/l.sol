pragma solidity ^0.7.0;

library L {

  function check(bool b) public {
    internalCheck(b);
  }

  function internalCheck(bool b) internal {
    require(b, "internalCheck");
  }

}
