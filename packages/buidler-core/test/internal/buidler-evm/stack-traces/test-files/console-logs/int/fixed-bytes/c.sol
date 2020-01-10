pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		int p3, bytes32 p18, uint p0, int p4, string memory p6, bool p9, address p12, bytes memory p15, bytes32 p19
	) public {
		console.log(console.asInt(p3), console.asHex(p18));
		console.log(console.asInt(p3), console.asHex(p18), p0);
		console.log(console.asInt(p3), console.asHex(p18), console.asInt(p4));
		console.log(console.asInt(p3), console.asHex(p18), p6);
		console.log(console.asInt(p3), console.asHex(p18), p9);
		console.log(console.asInt(p3), console.asHex(p18), p12);
		console.log(console.asInt(p3), console.asHex(p18), console.asHex(p15));
		console.log(console.asInt(p3), console.asHex(p18), console.asHex(p19));
	}
}
