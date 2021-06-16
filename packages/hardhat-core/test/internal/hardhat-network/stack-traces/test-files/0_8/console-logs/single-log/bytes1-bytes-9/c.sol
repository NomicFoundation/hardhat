pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
		bytes1 p15, bytes2 p16, bytes3 p17, bytes4 p18, bytes5 p19, bytes6 p20, bytes7 p21, bytes8 p22, bytes9 p23
	) public {
		console.logBytes1(p15);
		console.logBytes2(p16);
		console.logBytes3(p17);
		console.logBytes4(p18);
		console.logBytes5(p19);
		console.logBytes6(p20);
		console.logBytes7(p21);
		console.logBytes8(p22);
		console.logBytes9(p23);
	}
}
