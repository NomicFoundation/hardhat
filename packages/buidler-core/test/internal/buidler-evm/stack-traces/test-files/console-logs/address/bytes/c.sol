pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		address p12, bytes memory p15, uint p0, int p3, string memory p6, bool p9, address p13, bytes memory p16, bytes32 p18
	) public {
		console.log(p12, console.asHex(p15));
		console.log(p12, console.asHex(p15), p0);
		console.log(p12, console.asHex(p15), console.asInt(p3));
		console.log(p12, console.asHex(p15), p6);
		console.log(p12, console.asHex(p15), p9);
		console.log(p12, console.asHex(p15), p13);
		console.log(p12, console.asHex(p15), console.asHex(p16));
		console.log(p12, console.asHex(p15), console.asHex(p18));
	}
}
