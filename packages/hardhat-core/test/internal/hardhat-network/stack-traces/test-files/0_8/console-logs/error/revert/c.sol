pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

  function test() public {
    console.log(1);
    require(false, "req");
  }

}
