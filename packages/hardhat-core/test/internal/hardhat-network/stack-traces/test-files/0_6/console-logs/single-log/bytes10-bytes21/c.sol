pragma solidity ^0.6.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bytes10 p24, bytes11 p25, bytes12 p26, bytes13 p27, bytes14 p28, bytes15 p29,
    bytes16 p30, bytes17 p31, bytes18 p32, bytes19 p33, bytes20 p34, bytes21 p35 
	) public {
		console.logBytes10(p24);
		console.logBytes11(p25);
		console.logBytes12(p26);
		console.logBytes13(p27);
		console.logBytes14(p28);
		console.logBytes15(p29);
		console.logBytes16(p30);
		console.logBytes17(p31);
		console.logBytes18(p32);
		console.logBytes19(p33);
		console.logBytes20(p34);
		console.logBytes21(p35);
	}
}
