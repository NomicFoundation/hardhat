pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint p0, uint p1, uint p2, string memory p4, bool p8, address p12, uint p3, string memory p5, bool p9, address p13, string memory p6
	) public {
		console.log(p0, p1);
		console.log(p0, p1, p2);
		console.log(p0, p1, p4);
		console.log(p0, p1, p8);
		console.log(p0, p1, p12);
		console.log(p0, p1, p2, p3);
		console.log(p0, p1, p2, p4);
		console.log(p0, p1, p2, p8);
		console.log(p0, p1, p2, p12);
		console.log(p0, p1, p4, p2);
		console.log(p0, p1, p4, p5);
		console.log(p0, p1, p4, p8);
		console.log(p0, p1, p4, p12);
		console.log(p0, p1, p8, p2);
		console.log(p0, p1, p8, p4);
		console.log(p0, p1, p8, p9);
		console.log(p0, p1, p8, p12);
		console.log(p0, p1, p12, p2);
		console.log(p0, p1, p12, p4);
		console.log(p0, p1, p12, p8);
		console.log(p0, p1, p12, p13);
		// In the variable p6, the occurrences of %d and %i will be converted to %s when the count of % characters preceding the d or i is odd.
		// If the count is even, the % character is considered escaped and should not be replaced.
		console.log(p6);
	}
}
