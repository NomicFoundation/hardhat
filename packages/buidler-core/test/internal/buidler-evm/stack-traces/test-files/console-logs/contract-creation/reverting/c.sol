pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	constructor() public {
		console.log("C");
    revert();
	}
}
