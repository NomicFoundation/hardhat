pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract D {
  function f() public {
    console.log("D");
  }
}

contract C {

	function f() public {
		console.log("C1");
    D d = new D();
    d.f();
    console.log("C2");
	}
}
