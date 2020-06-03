pragma solidity ^0.6.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bool p8, string memory p4, uint p0, string memory p5, bool p9, address p12, uint p1, string memory p6, bool p10, address p13
	) public {
		console.log(p8, p4);
		console.log(p8, p4, p0);
		console.log(p8, p4, p5);
		console.log(p8, p4, p9);
		console.log(p8, p4, p12);
		console.log(p8, p4, p0, p1);
		console.log(p8, p4, p0, p5);
		console.log(p8, p4, p0, p9);
		console.log(p8, p4, p0, p12);
		console.log(p8, p4, p5, p0);
		console.log(p8, p4, p5, p6);
		console.log(p8, p4, p5, p9);
		console.log(p8, p4, p5, p12);
		console.log(p8, p4, p9, p0);
		console.log(p8, p4, p9, p5);
		console.log(p8, p4, p9, p10);
		console.log(p8, p4, p9, p12);
		console.log(p8, p4, p12, p0);
		console.log(p8, p4, p12, p5);
		console.log(p8, p4, p12, p9);
		console.log(p8, p4, p12, p13);
	}
}
