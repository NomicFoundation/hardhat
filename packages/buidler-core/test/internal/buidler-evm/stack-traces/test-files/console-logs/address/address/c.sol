pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		address p12, address p13, uint p0, int p3, string memory p6, bool p9, address p14, bytes memory p15, bytes32 p18
	) public {
		console.log(p12, p13);
		console.log(p12, p13, p0);
		console.log(p12, p13, console.asInt(p3));
		console.log(p12, p13, p6);
		console.log(p12, p13, p9);
		console.log(p12, p13, p14);
		console.log(p12, p13, console.asHex(p15));
		console.log(p12, p13, console.asHex(p18));
	}
}
