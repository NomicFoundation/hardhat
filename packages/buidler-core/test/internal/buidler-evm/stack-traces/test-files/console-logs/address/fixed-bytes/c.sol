pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		address p12, bytes32 p18, uint p0, int p3, string memory p6, bool p9, address p13, bytes memory p15, bytes32 p19
	) public {
		console.log(p12, console.asHex(p18));
		console.log(p12, console.asHex(p18), p0);
		console.log(p12, console.asHex(p18), console.asInt(p3));
		console.log(p12, console.asHex(p18), p6);
		console.log(p12, console.asHex(p18), p9);
		console.log(p12, console.asHex(p18), p13);
		console.log(p12, console.asHex(p18), console.asHex(p15));
		console.log(p12, console.asHex(p18), console.asHex(p19));
	}
}
