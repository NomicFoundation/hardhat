pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

function log() {
  console.log("log from top-level function");
}

contract C {
	function test() public {
    log();
	}
}
