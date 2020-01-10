pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint p0, address p12, uint p1, int p3, string memory p6, bool p9, address p13, bytes memory p15, bytes32 p18
	) public {
		console.log(p0, p12);
		console.log(p0, p12, p1);
		console.log(p0, p12, console.asInt(p3));
		console.log(p0, p12, p6);
		console.log(p0, p12, p9);
		console.log(p0, p12, p13);
		console.log(p0, p12, console.asHex(p15));
		console.log(p0, p12, console.asHex(p18));
	}
}
