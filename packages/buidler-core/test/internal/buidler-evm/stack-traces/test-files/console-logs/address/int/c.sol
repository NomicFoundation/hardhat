pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		address p12, int p3, uint p0, int p4, string memory p6, bool p9, address p13, bytes memory p15, bytes32 p18
	) public {
		console.log(p12, console.asInt(p3));
		console.log(p12, console.asInt(p3), p0);
		console.log(p12, console.asInt(p3), console.asInt(p4));
		console.log(p12, console.asInt(p3), p6);
		console.log(p12, console.asInt(p3), p9);
		console.log(p12, console.asInt(p3), p13);
		console.log(p12, console.asInt(p3), console.asHex(p15));
		console.log(p12, console.asInt(p3), console.asHex(p18));
	}
}
