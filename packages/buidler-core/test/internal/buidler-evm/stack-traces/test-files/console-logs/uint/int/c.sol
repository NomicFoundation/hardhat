pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint p0, int p3, uint p1, int p4, string memory p6, bool p9, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(p0, console.asInt(p3));
		console.log(p0, console.asInt(p3), p1);
		console.log(p0, console.asInt(p3), console.asInt(p4));
		console.log(p0, console.asInt(p3), p6);
		console.log(p0, console.asInt(p3), p9);
		console.log(p0, console.asInt(p3), p12);
		console.log(p0, console.asInt(p3), console.asHex(p15));
		console.log(p0, console.asInt(p3), console.asHex(p18));
	}
}
