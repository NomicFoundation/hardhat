pragma solidity ^0.6.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		address p12, string memory p4, uint p0, string memory p5, bool p8, address p13, uint p1, string memory p6, bool p9, address p14
	) public {
		console.log(p12, p4);
		console.log(p12, p4, p0);
		console.log(p12, p4, p5);
		console.log(p12, p4, p8);
		console.log(p12, p4, p13);
		console.log(p12, p4, p0, p1);
		console.log(p12, p4, p0, p5);
		console.log(p12, p4, p0, p8);
		console.log(p12, p4, p0, p13);
		console.log(p12, p4, p5, p0);
		console.log(p12, p4, p5, p6);
		console.log(p12, p4, p5, p8);
		console.log(p12, p4, p5, p13);
		console.log(p12, p4, p8, p0);
		console.log(p12, p4, p8, p5);
		console.log(p12, p4, p8, p9);
		console.log(p12, p4, p8, p13);
		console.log(p12, p4, p13, p0);
		console.log(p12, p4, p13, p5);
		console.log(p12, p4, p13, p8);
		console.log(p12, p4, p13, p14);
	}
}
