pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

  function test(bool b) public {
    console.log("string1");
    assert(b);
  }

}
