pragma solidity ^0.7.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bool p8, address p12, uint p0, string memory p4, bool p9, address p13, uint p1, string memory p5, bool p10, address p14
	) public {
		console.log(p8, p12);
		console.log(p8, p12, p0);
		console.log(p8, p12, p4);
		console.log(p8, p12, p9);
		console.log(p8, p12, p13);
		console.log(p8, p12, p0, p1);
		console.log(p8, p12, p0, p4);
		console.log(p8, p12, p0, p9);
		console.log(p8, p12, p0, p13);
		console.log(p8, p12, p4, p0);
		console.log(p8, p12, p4, p5);
		console.log(p8, p12, p4, p9);
		console.log(p8, p12, p4, p13);
		console.log(p8, p12, p9, p0);
		console.log(p8, p12, p9, p4);
		console.log(p8, p12, p9, p10);
		console.log(p8, p12, p9, p13);
		console.log(p8, p12, p13, p0);
		console.log(p8, p12, p13, p4);
		console.log(p8, p12, p13, p9);
		console.log(p8, p12, p13, p14);
	}
}
