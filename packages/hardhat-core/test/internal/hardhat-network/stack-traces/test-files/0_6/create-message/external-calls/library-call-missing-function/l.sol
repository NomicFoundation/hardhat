pragma solidity ^0.6.0;

library L {

  function check(bool b) public {
    require(b, "check");
  }

}

library OtherL {

  function check() public {
    revert();
  }

}
