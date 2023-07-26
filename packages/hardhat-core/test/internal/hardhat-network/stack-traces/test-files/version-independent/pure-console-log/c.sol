pragma solidity >=0.5.1;

import "./../../../../../../../console.sol";

contract C  {

  constructor() public {
    log();
  }

  function log() internal pure {
    console.log("hello");
  }

}
