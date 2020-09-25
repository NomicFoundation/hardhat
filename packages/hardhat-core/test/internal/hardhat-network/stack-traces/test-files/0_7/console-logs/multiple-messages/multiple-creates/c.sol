pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract D {
  constructor() public {
    console.log("D");
  }
}

contract C {

	constructor() public {
		console.log("C1");
    new D();
    console.log("C2");
	}
}
