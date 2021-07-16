pragma solidity ^0.8.0;

library L {

  function check(bool b) public {
    internalCheck(b);
  }

  function internalCheck(bool b) internal {
    require(b, "internalCheck");
  }

}
