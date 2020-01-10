pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		string memory p6, bool p9, uint p0, int p3, string memory p7, bool p10, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(p6, p9);
		console.log(p6, p9, p0);
		console.log(p6, p9, console.asInt(p3));
		console.log(p6, p9, p7);
		console.log(p6, p9, p10);
		console.log(p6, p9, p12);
		console.log(p6, p9, console.asHex(p15));
		console.log(p6, p9, console.asHex(p18));
	}
}
