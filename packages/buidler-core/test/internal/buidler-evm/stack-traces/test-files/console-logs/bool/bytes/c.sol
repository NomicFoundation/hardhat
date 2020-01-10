pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bool p9, bytes memory p15, uint p0, int p3, string memory p6, bool p10, address p12, bytes memory p16, bytes32 p18
	) public {
		console.log(p9, console.asHex(p15));
		console.log(p9, console.asHex(p15), p0);
		console.log(p9, console.asHex(p15), console.asInt(p3));
		console.log(p9, console.asHex(p15), p6);
		console.log(p9, console.asHex(p15), p10);
		console.log(p9, console.asHex(p15), p12);
		console.log(p9, console.asHex(p15), console.asHex(p16));
		console.log(p9, console.asHex(p15), console.asHex(p18));
	}
}
