pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		address p12, address p13, uint p0, string memory p4, bool p8, address p14, uint p1, string memory p5, bool p9
	) public {
		console.log(p12, p13);
		console.log(p12, p13, p0);
		console.log(p12, p13, p4);
		console.log(p12, p13, p8);
		console.log(p12, p13, p14);
		console.log(p12, p13, p0, p1);
		console.log(p12, p13, p0, p4);
		console.log(p12, p13, p0, p8);
		console.log(p12, p13, p0, p14);
		console.log(p12, p13, p4, p0);
		console.log(p12, p13, p4, p5);
		console.log(p12, p13, p4, p8);
		console.log(p12, p13, p4, p14);
		console.log(p12, p13, p8, p0);
		console.log(p12, p13, p8, p4);
		console.log(p12, p13, p8, p9);
		console.log(p12, p13, p8, p14);
		console.log(p12, p13, p14, p0);
		console.log(p12, p13, p14, p4);
		console.log(p12, p13, p14, p8);
		console.log(p12, p13, p14, p14);
	}
}
