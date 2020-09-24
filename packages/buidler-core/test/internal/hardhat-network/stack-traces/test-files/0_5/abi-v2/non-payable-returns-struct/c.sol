pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract C {
  struct MyStruct {
    uint x;
    uint y;
  }

  function test() public returns (MyStruct[] memory) {
    MyStruct[] memory structs = new MyStruct[](2);
    structs[0] = MyStruct(1, 2);
    structs[1] = MyStruct(2, 3);
    return structs;
  }
}
