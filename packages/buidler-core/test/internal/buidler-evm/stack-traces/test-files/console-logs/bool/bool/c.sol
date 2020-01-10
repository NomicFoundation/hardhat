pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bool p9, bool p10, uint p0, int p3, string memory p6, bool p11, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(p9, p10);
		console.log(p9, p10, p0);
		console.log(p9, p10, console.asInt(p3));
		console.log(p9, p10, p6);
		console.log(p9, p10, p11);
		console.log(p9, p10, p12);
		console.log(p9, p10, console.asHex(p15));
		console.log(p9, p10, console.asHex(p18));
	}
}
