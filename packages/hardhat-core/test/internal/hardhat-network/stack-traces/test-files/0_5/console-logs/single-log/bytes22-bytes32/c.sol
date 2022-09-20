pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

	function log(
  		bytes22 p36, bytes23 p37, bytes24 p38, bytes25 p39, bytes26 p40, bytes27 p41,
  		bytes28 p42, bytes29 p43, bytes30 p44, bytes31 p45, bytes32 p46
  ) public {
    console.logBytes22(p36);
    console.logBytes23(p37);
    console.logBytes24(p38);
    console.logBytes25(p39);
    console.logBytes26(p40);
    console.logBytes27(p41);
    console.logBytes28(p42);
    console.logBytes29(p43);
    console.logBytes30(p44);
    console.logBytes31(p45);
    console.logBytes32(p46);
  }
}
