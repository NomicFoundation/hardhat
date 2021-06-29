pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

function log() {
  console.log("log from top-level function");
}

contract C {
	function test() public {
    log();
	}
}
