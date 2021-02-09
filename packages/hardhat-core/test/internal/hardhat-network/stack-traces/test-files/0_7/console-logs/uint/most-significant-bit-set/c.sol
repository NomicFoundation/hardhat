pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint256 p0, uint256 p1, int256 p2, int256 p3
	) public {
		console.log(p0);
    console.log(p1);
    console.logInt(p2);
		console.logInt(p3);
	}
}
