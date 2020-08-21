pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract D {
  function f() public {
    console.log("D");
    revert("");
  }
}

contract C {

	function f() public {
		console.log("C1");
    D d = new D();
    d.f();
	}
}
