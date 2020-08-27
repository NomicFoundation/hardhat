pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		uint p0, address p12, uint p1, string memory p4, bool p8, address p13, uint p2, string memory p5, bool p9, address p14
	) public {
		console.log(p0, p12);
		console.log(p0, p12, p1);
		console.log(p0, p12, p4);
		console.log(p0, p12, p8);
		console.log(p0, p12, p13);
		console.log(p0, p12, p1, p2);
		console.log(p0, p12, p1, p4);
		console.log(p0, p12, p1, p8);
		console.log(p0, p12, p1, p13);
		console.log(p0, p12, p4, p1);
		console.log(p0, p12, p4, p5);
		console.log(p0, p12, p4, p8);
		console.log(p0, p12, p4, p13);
		console.log(p0, p12, p8, p1);
		console.log(p0, p12, p8, p4);
		console.log(p0, p12, p8, p9);
		console.log(p0, p12, p8, p13);
		console.log(p0, p12, p13, p1);
		console.log(p0, p12, p13, p4);
		console.log(p0, p12, p13, p8);
		console.log(p0, p12, p13, p14);
	}
}
