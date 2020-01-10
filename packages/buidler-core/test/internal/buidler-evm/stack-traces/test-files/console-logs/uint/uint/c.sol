pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint p0, uint p1, uint p2, int p3, string memory p6, bool p9, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(p0, p1);
		console.log(p0, p1, p2);
		console.log(p0, p1, console.asInt(p3));
		console.log(p0, p1, p6);
		console.log(p0, p1, p9);
		console.log(p0, p1, p12);
		console.log(p0, p1, console.asHex(p15));
		console.log(p0, p1, console.asHex(p18));
	}
}
