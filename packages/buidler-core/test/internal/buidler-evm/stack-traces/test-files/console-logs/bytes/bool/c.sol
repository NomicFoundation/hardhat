pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bytes memory p15, bool p9, uint p0, int p3, string memory p6, bool p10, address p12, bytes memory p16, bytes32 p18
	) public {
		console.log(console.asHex(p15), p9);
		console.log(console.asHex(p15), p9, p0);
		console.log(console.asHex(p15), p9, console.asInt(p3));
		console.log(console.asHex(p15), p9, p6);
		console.log(console.asHex(p15), p9, p10);
		console.log(console.asHex(p15), p9, p12);
		console.log(console.asHex(p15), p9, console.asHex(p16));
		console.log(console.asHex(p15), p9, console.asHex(p18));
	}
}
