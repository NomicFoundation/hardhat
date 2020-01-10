pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		int p3, bool p9, uint p0, int p4, string memory p6, bool p10, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(console.asInt(p3), p9);
		console.log(console.asInt(p3), p9, p0);
		console.log(console.asInt(p3), p9, console.asInt(p4));
		console.log(console.asInt(p3), p9, p6);
		console.log(console.asInt(p3), p9, p10);
		console.log(console.asInt(p3), p9, p12);
		console.log(console.asInt(p3), p9, console.asHex(p15));
		console.log(console.asInt(p3), p9, console.asHex(p18));
	}
}
