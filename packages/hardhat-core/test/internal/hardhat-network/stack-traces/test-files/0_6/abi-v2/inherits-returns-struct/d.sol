pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./../../../../../../../../console.sol";
import "./d.sol";

struct MyStruct {
  uint x;
  uint y;
}

contract D {
  function test() public virtual returns (MyStruct[] memory) {
    MyStruct[] memory structs = new MyStruct[](2);
    structs[0].x = 1;
    structs[1].x = 2;
    console.log(structs[0].x);
    return structs;
  }
}
