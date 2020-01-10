pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		int p3, address p12, uint p0, int p4, string memory p6, bool p9, address p13, bytes memory p15, bytes32 p18
	) public {
		console.log(console.asInt(p3), p12);
		console.log(console.asInt(p3), p12, p0);
		console.log(console.asInt(p3), p12, console.asInt(p4));
		console.log(console.asInt(p3), p12, p6);
		console.log(console.asInt(p3), p12, p9);
		console.log(console.asInt(p3), p12, p13);
		console.log(console.asInt(p3), p12, console.asHex(p15));
		console.log(console.asInt(p3), p12, console.asHex(p18));
	}
}
