pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./../../../../../../../../console.sol";

contract D {
  struct MyStruct {
    uint x;
    uint y;
  }

  function test() public returns (MyStruct[] memory) {
    MyStruct[] memory structs = new MyStruct[](2);
    structs[0].x = 1;
    structs[1].x = 2;
    console.log(structs[0].x);
    return structs;
  }
}
