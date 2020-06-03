pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./../../../../../../../../console.sol";
import "./d.sol";

contract C is D {
  function test() public override returns (MyStruct[] memory) {
    MyStruct[] memory structs = super.test();
    console.log(structs[1].x);
    return structs;
  }
}
