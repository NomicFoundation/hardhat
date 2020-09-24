pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract C {

	constructor() public {
		console.log("C");
    revert("");
	}
}
