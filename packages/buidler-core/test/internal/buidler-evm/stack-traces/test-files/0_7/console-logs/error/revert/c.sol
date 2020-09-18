pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract C {

  function test() public {
    console.log(1);
    require(false, "req");
  }

}
