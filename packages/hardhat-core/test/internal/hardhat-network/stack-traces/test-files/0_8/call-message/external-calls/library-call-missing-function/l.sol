pragma solidity ^0.8.0;

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
