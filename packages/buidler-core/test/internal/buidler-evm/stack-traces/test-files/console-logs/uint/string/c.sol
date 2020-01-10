pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint p0, string memory p6, uint p1, int p3, string memory p7, bool p9, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(p0, p6);
		console.log(p0, p6, p1);
		console.log(p0, p6, console.asInt(p3));
		console.log(p0, p6, p7);
		console.log(p0, p6, p9);
		console.log(p0, p6, p12);
		console.log(p0, p6, console.asHex(p15));
		console.log(p0, p6, console.asHex(p18));
	}
}
