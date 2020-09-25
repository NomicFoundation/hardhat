pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./../../../../../../../../console.sol";

contract C {
  struct MyStruct {
    address a;
  }

  function log() public {
    MyStruct[] memory ms = getStructs();
    console.log(ms[0].a);
  }

  function getStructs() public returns (MyStruct[] memory) {
    MyStruct[] memory structs = new MyStruct[](2);
    structs[0] = MyStruct(0x0000000000000000000000000000000000000001);
    structs[1] = MyStruct(0x0000000000000000000000000000000000000002);

    return structs;
  }
}
