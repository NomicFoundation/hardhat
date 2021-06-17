pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint p0, string memory p4, bool p8, address p12, int p13, bytes memory p14
	) public {
		console.logUint(p0);
		console.logString(p4);
		console.logBool(p8);
		console.logAddress(p12);
		console.logInt(p13);
		console.logBytes(p14);
	}
}
