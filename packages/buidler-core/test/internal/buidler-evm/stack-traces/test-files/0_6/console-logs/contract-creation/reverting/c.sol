pragma solidity ^0.6.0;

import "./../../../../../../../../console.sol";

contract C {

	constructor() public {
		console.log("C");
    revert("");
	}
}
