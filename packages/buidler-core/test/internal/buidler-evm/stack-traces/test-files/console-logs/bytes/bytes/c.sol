pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bytes memory p15, bytes memory p16, uint p0, int p3, string memory p6, bool p9, address p12, bytes memory p17, bytes32 p18
	) public {
		console.log(console.asHex(p15), console.asHex(p16));
		console.log(console.asHex(p15), console.asHex(p16), p0);
		console.log(console.asHex(p15), console.asHex(p16), console.asInt(p3));
		console.log(console.asHex(p15), console.asHex(p16), p6);
		console.log(console.asHex(p15), console.asHex(p16), p9);
		console.log(console.asHex(p15), console.asHex(p16), p12);
		console.log(console.asHex(p15), console.asHex(p16), console.asHex(p17));
		console.log(console.asHex(p15), console.asHex(p16), console.asHex(p18));
	}
}
