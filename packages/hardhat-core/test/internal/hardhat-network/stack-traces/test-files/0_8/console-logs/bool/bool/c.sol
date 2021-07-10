pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bool p8, bool p9, uint p0, string memory p4, bool p10, address p12, uint p1, string memory p5, bool p11, address p13
	) public {
		console.log(p8, p9);
		console.log(p8, p9, p0);
		console.log(p8, p9, p4);
		console.log(p8, p9, p10);
		console.log(p8, p9, p12);
		console.log(p8, p9, p0, p1);
		console.log(p8, p9, p0, p4);
		console.log(p8, p9, p0, p10);
		console.log(p8, p9, p0, p12);
		console.log(p8, p9, p4, p0);
		console.log(p8, p9, p4, p5);
		console.log(p8, p9, p4, p10);
		console.log(p8, p9, p4, p12);
		console.log(p8, p9, p10, p0);
		console.log(p8, p9, p10, p4);
		console.log(p8, p9, p10, p11);
		console.log(p8, p9, p10, p12);
		console.log(p8, p9, p12, p0);
		console.log(p8, p9, p12, p4);
		console.log(p8, p9, p12, p10);
		console.log(p8, p9, p12, p13);
	}
}
