pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

struct MyStruct {
  uint x;
  uint y;
}

contract C {
  function test() public returns (MyStruct[] memory) {
    MyStruct[] memory structs = new MyStruct[](2);
    structs[0] = MyStruct(1, 2);
    structs[1] = MyStruct(2, 3);
    return structs;
  }
}
