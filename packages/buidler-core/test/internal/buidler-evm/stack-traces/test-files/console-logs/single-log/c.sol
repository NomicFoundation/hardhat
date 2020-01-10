pragma solidity ^0.5.0;

import "./../../../../../../../console.sol";

contract C {

	function log(
		uint p0, int p3, string memory p6, bool p9, address p12, bytes memory p15, bytes32 p18
	) public {
		console.log(p0);
		console.log(console.asInt(p3));
		console.log(p6);
		console.log(p9);
		console.log(p12);
		console.log(console.asHex(p15));
		console.log(console.asHex(p18));
	}
}
