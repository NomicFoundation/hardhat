pragma solidity ^0.6.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		string memory p4, string memory p5, uint p0, string memory p6, bool p8, address p12, uint p1, string memory p7, bool p9, address p13
	) public {
		console.log(p4, p5);
		console.log(p4, p5, p0);
		console.log(p4, p5, p6);
		console.log(p4, p5, p8);
		console.log(p4, p5, p12);
		console.log(p4, p5, p0, p1);
		console.log(p4, p5, p0, p6);
		console.log(p4, p5, p0, p8);
		console.log(p4, p5, p0, p12);
		console.log(p4, p5, p6, p0);
		console.log(p4, p5, p6, p7);
		console.log(p4, p5, p6, p8);
		console.log(p4, p5, p6, p12);
		console.log(p4, p5, p8, p0);
		console.log(p4, p5, p8, p6);
		console.log(p4, p5, p8, p9);
		console.log(p4, p5, p8, p12);
		console.log(p4, p5, p12, p0);
		console.log(p4, p5, p12, p6);
		console.log(p4, p5, p12, p8);
		console.log(p4, p5, p12, p13);
	}
}
