pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		int p3, uint p0, uint p1, int p4, string memory p6, bool p9, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(console.asInt(p3), p0);
		console.log(console.asInt(p3), p0, p1);
		console.log(console.asInt(p3), p0, console.asInt(p4));
		console.log(console.asInt(p3), p0, p6);
		console.log(console.asInt(p3), p0, p9);
		console.log(console.asInt(p3), p0, p12);
		console.log(console.asInt(p3), p0, console.asHex(p15));
		console.log(console.asInt(p3), p0, console.asHex(p18));
	}
}
